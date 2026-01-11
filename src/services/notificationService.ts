import { getDb } from '../db/init';
import { Platform } from 'react-native'; 

// Helper to load Notifications module lazily and safely
function getNotificationsModule() {
  try {
    return require('expo-notifications');
  } catch (e) {
    console.warn("⚠️ expo-notifications module not found or failed to load");
    return null;
  }
}

// Initialize handler if possible - safely check for module availability
// Moved to init function to avoid side effects at import time
function setupNotificationHandler() {
  const Notifications = getNotificationsModule();
  if (Notifications) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (e) {
      console.warn("⚠️ Failed to set notification handler", e);
    }
  }
}

// ============================================================
// 🔧 TYPES
// ============================================================

export interface RappelItem {
  id: number;
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
  // Champs joints
  nomListe?: string;
  nombreArticles?: number;
  notificationId?: string; // ID pour annuler si besoin
  // Champs calculés
  isToday?: boolean;
  isTomorrow?: boolean;
  isPast?: boolean;
  isUrgent?: boolean;
}

// ============================================================
// 🔧 CONFIGURATION
// ============================================================

export function isRunningInExpoGo(): boolean {
  return true; // Pour Expo Go, toujours true
}

// ============================================================
// 🗄️ INITIALISATION
// ============================================================

export function initNotificationTables(): void {
  // Déjà géré dans db/init.ts
  console.log('✅ Table Rappel gérée par init.ts');
  
  // Only setup notifications if not in Expo Go
  if (!isRunningInExpoGo()) {
    setupNotificationHandler();
    registerForPushNotificationsAsync();
  } else {
    console.log('📱 Mode Expo Go - Rappels locaux actifs');
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
    
    // 1. Planifier la notification système
    let notificationId = '';
    const now = new Date();
    const triggerSeconds = Math.floor((dateRappel.getTime() - now.getTime()) / 1000);

    const N = getNotificationsModule();
    if (N && triggerSeconds > 0) {
      notificationId = await N.scheduleNotificationAsync({
        content: {
          title: titre,
          body: message,
          data: { idListeAchat, type },
          sound: 'default'
        },
        trigger: {
          seconds: triggerSeconds,
        } as any,
      });
      console.log(`🔔 Notification système planifiée (ID: ${notificationId}) pour dans ${triggerSeconds}s`);
    } else if (!N) {
       // Silent fail or log
    } else {
      console.warn("⚠️ Date de rappel passée, pas de notification système planifiée.");
    }

    // 2. Enregistrer en base de données
    // Note: On pourrait stocker notificationId dans une nouvelle colonne si on voulait l'annuler plus tard
    // Pour l'instant on garde le schéma actuel
    
    const result = db.runSync(
      `INSERT INTO Rappel (idListeAchat, titre, message, dateRappel, heureRappel, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idListeAchat, titre, message, dateStr, heureStr, type]
    );
    
    console.log(`✅ Rappel DB créé: ID ${result.lastInsertRowId}`);
    return result.lastInsertRowId as number;
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
        r.*,
        l.nomListe,
        (SELECT COUNT(*) FROM Article WHERE idListeAchat = r.idListeAchat) as nombreArticles
      FROM Rappel r
      LEFT JOIN ListeAchat l ON r.idListeAchat = l.id
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
    db.runSync('UPDATE Rappel SET estLu = 1 WHERE id = ?', [rappelId]);
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
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// ============================================================
// 🗑️ SUPPRIMER UN RAPPEL
// ============================================================

export function supprimerRappel(rappelId: number): void {
  try {
    const db = getDb();
    db.runSync('UPDATE Rappel SET supprime = 1 WHERE id = ?', [rappelId]);
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
      SELECT r.*, l.nomListe
      FROM Rappel r
      LEFT JOIN ListeAchat l ON r.idListeAchat = l.id
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
    db.runSync('UPDATE Rappel SET affiche = 1 WHERE id = ?', [rappelId]);
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
// 🔄 FONCTIONS LEGACY (pour compatibilité avec l'ancien code)
// ============================================================

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  const N = getNotificationsModule();
  if (!N) {
      console.log('❌ Notifications non disponibles');
      return false;
  }

  // Skip push notification setup in Expo Go
  if (isRunningInExpoGo()) {
    console.log('📱 Mode Expo Go - Rappels locaux actifs');
    return false;
  }

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'default',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await N.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Permission refusée pour les notifications push!');
    return false;
  }
  
  return true;
}

export function areNotificationsAvailable(): boolean {
  return true;
}

// Alias pour compatibilité avec l'ancien code
export const getNotifications = getRappels;
export const supprimerNotification = supprimerRappel;
export const getUnreadNotificationCount = getUnreadCount;
export const marquerNotificationLue = marquerCommeLu;
