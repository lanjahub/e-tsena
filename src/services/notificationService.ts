import { getDb } from '../db/init';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Helper to load Notifications module lazily and safely
let NotificationsModule: any = null;
let notificationLoadAttempted = false;

function getNotificationsModule() {
  if (notificationLoadAttempted) {
    return NotificationsModule;
  }
  
  notificationLoadAttempted = true;
  
  // Ne pas charger les notifications push dans Expo Go (SDK 53+)
  const executionEnvironment = Constants.executionEnvironment;
  if (executionEnvironment === 'storeClient') {
    console.log('📱 Mode Expo Go - Rappels locaux actifs');
    NotificationsModule = undefined;
    return NotificationsModule;
  }
  
  try {
    NotificationsModule = require('expo-notifications');
  } catch (e) {
    console.warn("⚠️ expo-notifications module not found");
    NotificationsModule = undefined;
  }
  
  return NotificationsModule;
}

// ============================================================
// 🔧 TYPES
// ============================================================

export interface RappelItem {
  idRappel: number;
  idListeAchat: number;
  titre: string;
  message: string;
  dateRappel: string;
  heureRappel: string;
  type: string;
  estLu: number;
  supprime: number;
  affiche: number;
  createdAt: string;
  nomListe?: string;
  nombreArticles?: number;
  notificationId?: string;
  isToday?: boolean;
  isTomorrow?: boolean;
  isPast?: boolean;
  isUrgent?: boolean;
  lu?: number; // Alias pour estLu
  achatId?: number; // Alias pour idListeAchat
}

// ============================================================
// 🔧 CONFIGURATION
// ============================================================

export function isRunningInExpoGo(): boolean {
  // Vérifie si on tourne dans Expo Go
  const executionEnvironment = Constants.executionEnvironment;
  return executionEnvironment === 'storeClient'; // Expo Go
}

export function isNativeBuild(): boolean {
  // Vérifie si c'est un build natif
  const executionEnvironment = Constants.executionEnvironment;
  return executionEnvironment === 'standalone' || executionEnvironment === 'bare';
}

// ============================================================
// 🔔 SETUP NOTIFICATION HANDLER
// ============================================================

function setupNotificationHandler() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    console.log('✅ Notification handler configuré');
  } catch (e) {
    console.warn("⚠️ Failed to set notification handler", e);
  }
}

// ============================================================
// 🗄️ INITIALISATION
// ============================================================

export async function initNotificationService(): Promise<boolean> {
  console.log('🔔 Initialisation service notifications...');
  
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    console.log('❌ Module notifications non disponible');
    return false;
  }

  try {
    // Setup handler
    setupNotificationHandler();

    // Configurer les canaux Android
    if (Platform.OS === 'android') {
      // Canal par défaut
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Rappels E-tsena',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      
      // Canal spécifique pour les rappels
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Rappels de courses',
        description: 'Notifications pour vos listes de courses et rappels',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
      
      console.log('✅ Canaux Android configurés (default + reminders)');
    }

    // Demander les permissions
    const permissionGranted = await registerForPushNotificationsAsync();
    
    console.log('✅ Service notifications initialisé');
    return permissionGranted;
  } catch (error) {
    console.error('❌ Erreur init notifications:', error);
    return false;
  }
}

export function initNotificationTables(): void {
  console.log('✅ Table Rappel gérée par init.ts');
  initNotificationService();
}

// ============================================================
// 🔔 DEMANDER PERMISSIONS
// ============================================================

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    console.log('❌ Notifications non disponibles');
    return false;
  }

  try {
    // Vérifier les permissions actuelles
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si pas déjà accordé, demander
    if (existingStatus !== 'granted') {
      console.log('🔔 Demande de permissions notifications...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Permission notifications refusée');
      console.log('   Les rappels seront enregistrés mais ne déclencheront pas de notifications');
      return false;
    }

    console.log('✅ Permissions notifications accordées');
    
    // Pour Android, vérifier les permissions spécifiques
    if (Platform.OS === 'android') {
      const settings = await Notifications.getPermissionsAsync();
      console.log('📱 Paramètres Android:', {
        canAskAgain: settings.canAskAgain,
        granted: settings.granted,
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur permissions:', error);
    return false;
  }
}

// ============================================================
// 📅 CRÉER UN RAPPEL
// ============================================================

export async function creerRappel(
  idListeAchat: number,
  titre: string,
  message: string,
  dateRappel: Date,
  type: string = 'rappel'
): Promise<number | null> {
  try {
    const db = getDb();
    const dateStr = dateRappel.toISOString().split('T')[0];
    const heureStr = dateRappel.toTimeString().slice(0, 5);

    // 1. Vérifier et demander les permissions si nécessaire
    const hasPermission = await registerForPushNotificationsAsync();
    if (!hasPermission) {
      console.warn('⚠️ Permissions notification non accordées');
    }

    // 2. Planifier la notification système
    let notificationId = '';
    const now = new Date();
    const triggerSeconds = Math.floor((dateRappel.getTime() - now.getTime()) / 1000);

    const Notifications = getNotificationsModule();
    if (Notifications && triggerSeconds > 0 && hasPermission) {
      try {
        // Configuration complète de la notification
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${titre}`,
            body: message || `Il est temps d'aller faire vos courses !`,
            data: { 
              idListeAchat, 
              type,
              action: 'openList',
              screen: 'achat',
              listId: String(idListeAchat),
              timestamp: Date.now()
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            badge: 1,
            ...(Platform.OS === 'android' && {
              channelId: 'reminders',
              color: '#7C3AED',
              vibrate: [0, 250, 250, 250],
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dateRappel,
            channelId: 'reminders',
          },
        });
        
        const minutes = Math.round(triggerSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const timeStr = hours > 0 ? `${hours}h${minutes % 60}min` : `${minutes}min`;
        console.log(`🔔 Notification planifiée (ID: ${notificationId}) dans ${timeStr}`);
        console.log(`   Date: ${dateRappel.toLocaleString('fr-FR')}`);
      } catch (notifError) {
        console.error('❌ Erreur planification notification:', notifError);
      }
    } else if (triggerSeconds <= 0) {
      console.warn("⚠️ Date passée, notification non planifiée");
    }

    // 3. Enregistrer en base
    const result = db.runSync(
      `INSERT INTO Rappel (idListeAchat, titre, message, dateRappel, heureRappel, type, notificationId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idListeAchat, titre, message, dateStr, heureStr, type, notificationId]
    );

    console.log(`✅ Rappel créé: ID ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Erreur création rappel:', error);
    return null;
  }
}

// ============================================================
// 📋 OBTENIR TOUS LES RAPPELS
// ============================================================

export function getRappels(): RappelItem[] {
  try {
    const db = getDb();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    const result = db.getAllSync(`
      SELECT 
        r.idRappel as idRappel,
        r.*,
        l.nomListe,
        r.idListeAchat as achatId,
        r.estLu as lu,
        (SELECT COUNT(*) FROM Article WHERE idListeAchat = r.idListeAchat) as nombreArticles
      FROM Rappel r
      LEFT JOIN ListeAchat l ON r.idListeAchat = l.idListe
      WHERE r.supprime = 0
      ORDER BY r.dateRappel ASC, r.heureRappel ASC
    `) as any[];

    return result.map((item) => ({
      ...item,
      isToday: item.dateRappel === today,
      isTomorrow: item.dateRappel === tomorrow,
      isPast: item.dateRappel < today || (item.dateRappel === today && item.heureRappel < currentTime),
      isUrgent: item.dateRappel === today && item.heureRappel <= currentTime && item.affiche === 0,
    }));
  } catch (error) {
    console.error('❌ Erreur récupération rappels:', error);
    return [];
  }
}

// ============================================================
// ✅ MARQUER COMME LU
// ============================================================

export function marquerCommeLu(rappelId: number): void {
  try {
    const db = getDb();
    db.runSync('UPDATE Rappel SET estLu = 1 WHERE idRappel = ?', [rappelId]);
    console.log(`✅ Rappel ${rappelId} marqué comme lu`);
  } catch (error) {
    console.error('❌ Erreur marquage lu:', error);
  }
}

// ============================================================
// ✅ MARQUER TOUT COMME LU
// ============================================================

export function marquerToutCommeLu(): void {
  try {
    const db = getDb();
    db.runSync('UPDATE Rappel SET estLu = 1 WHERE supprime = 0');
    console.log('✅ Tous les rappels marqués comme lus');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// ============================================================
// 🗑️ SUPPRIMER UN RAPPEL
// ============================================================

export async function supprimerRappel(rappelId: number): Promise<void> {
  try {
    const db = getDb();
    
    // Récupérer l'ID de notification si existant
    const rappel = db.getAllSync(
      'SELECT notificationId FROM Rappel WHERE idRappel = ?',
      [rappelId]
    ) as any[];
    
    if (rappel[0]?.notificationId) {
      // Annuler la notification planifiée
      const Notifications = getNotificationsModule();
      if (Notifications) {
        try {
          await Notifications.cancelScheduledNotificationAsync(rappel[0].notificationId);
          console.log('🔕 Notification annulée');
        } catch (e) {
          console.warn('⚠️ Erreur annulation notification:', e);
        }
      }
    }
    
    // Marquer comme supprimé
    db.runSync('UPDATE Rappel SET supprime = 1 WHERE idRappel = ?', [rappelId]);
    console.log(`✅ Rappel ${rappelId} supprimé`);
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
  }
}

// ============================================================
// 🔢 COMPTER LES NON LUS
// ============================================================

export function getUnreadCount(): number {
  try {
    const db = getDb();
    const result = db.getAllSync(
      'SELECT COUNT(*) as count FROM Rappel WHERE estLu = 0 AND supprime = 0'
    ) as any[];
    return result[0]?.count || 0;
  } catch {
    return 0;
  }
}

// ============================================================
// 🔔 VÉRIFIER LES RAPPELS À AFFICHER
// ============================================================

export function verifierRappelsAafficher(): RappelItem[] {
  try {
    const db = getDb();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const heureStr = now.toTimeString().slice(0, 5);

    const result = db.getAllSync(`
      SELECT r.*, l.nomListe, r.idListeAchat as achatId
      FROM Rappel r
      LEFT JOIN ListeAchat l ON r.idListeAchat = l.idListe
      WHERE r.supprime = 0 
        AND r.affiche = 0
        AND (
          r.dateRappel < ? 
          OR (r.dateRappel = ? AND r.heureRappel <= ?)
        )
      ORDER BY r.dateRappel DESC, r.heureRappel DESC
    `, [dateStr, dateStr, heureStr]) as any[];

    return result as RappelItem[];
  } catch (error) {
    console.error('❌ Erreur vérification rappels:', error);
    return [];
  }
}

// ============================================================
// ✅ MARQUER COMME AFFICHÉ
// ============================================================

export function marquerCommeAffiche(rappelId: number): void {
  try {
    const db = getDb();
    db.runSync('UPDATE Rappel SET affiche = 1 WHERE idRappel = ?', [rappelId]);
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// ============================================================
// 📊 STATISTIQUES
// ============================================================

export function getStats(): { total: number; nonLus: number; aujourdhui: number } {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const total = (db.getAllSync(
      'SELECT COUNT(*) as c FROM Rappel WHERE supprime = 0'
    ) as any[])[0]?.c || 0;

    const nonLus = (db.getAllSync(
      'SELECT COUNT(*) as c FROM Rappel WHERE supprime = 0 AND estLu = 0'
    ) as any[])[0]?.c || 0;

    const aujourdhui = (db.getAllSync(
      'SELECT COUNT(*) as c FROM Rappel WHERE supprime = 0 AND dateRappel = ?',
      [today]
    ) as any[])[0]?.c || 0;

    return { total, nonLus, aujourdhui };
  } catch {
    return { total: 0, nonLus: 0, aujourdhui: 0 };
  }
}

// ============================================================
// 🔔 ENVOYER UNE NOTIFICATION IMMÉDIATE
// ============================================================

export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Immédiat
    });
    return id;
  } catch (error) {
    console.error('❌ Erreur notification immédiate:', error);
    return null;
  }
}

// ============================================================
// 📋 OBTENIR TOUTES LES NOTIFICATIONS PLANIFIÉES
// ============================================================

export async function getScheduledNotifications(): Promise<any[]> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return [];

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

// ============================================================
// 🗑️ ANNULER TOUTES LES NOTIFICATIONS
// ============================================================

export async function cancelAllNotifications(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Toutes les notifications annulées');
  } catch (error) {
    console.error('❌ Erreur annulation:', error);
  }
}

// ============================================================
// 🔄 FONCTIONS LEGACY (compatibilité)
// ============================================================

export function areNotificationsAvailable(): boolean {
  return getNotificationsModule() !== undefined;
}

export const getNotifications = getRappels;
export const supprimerNotification = supprimerRappel;
export const getUnreadNotificationCount = getUnreadCount;
export const marquerNotificationLue = marquerCommeLu;