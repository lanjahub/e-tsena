// src/services/notificationService.ts

import { getDb } from '../db/init';

// ============================================================
// 🔧 TYPES
// ============================================================

export interface RappelItem {
  id: number;
  achatId: number;
  titre: string;
  message: string;
  dateRappel: string;
  heureRappel: string;
  type: string;
  lu: number;
  supprime: number;
  affiche: number;
  createdAt: string;
  nomListe?: string;
  nombreArticles?: number;
  isToday?: boolean;
  isTomorrow?: boolean;
  isPast?: boolean;
  isUrgent?: boolean;
}

// ============================================================
// 🔧 CONFIGURATION
// ============================================================

export function isRunningInExpoGo(): boolean {
  return true;
}

// ============================================================
// 🗄️ INITIALISATION
// ============================================================

export function initNotificationTables(): void {
  try {
    const db = getDb();
    
    db.runSync(`
      CREATE TABLE IF NOT EXISTS Rappel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        achatId INTEGER,
        titre TEXT NOT NULL,
        message TEXT NOT NULL,
        dateRappel TEXT NOT NULL,
        heureRappel TEXT NOT NULL,
        type TEXT DEFAULT 'rappel',
        lu INTEGER DEFAULT 0,
        supprime INTEGER DEFAULT 0,
        affiche INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (achatId) REFERENCES Achat(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Table Rappel initialisée');
  } catch (e) {
    console.log('⚠️ Table Rappel existe déjà');
  }
}

// ============================================================
// 📅 CRÉER UN RAPPEL
// ============================================================

export function creerRappel(
  achatId: number,
  titre: string,
  message: string,
  dateRappel: Date,
  type: string = 'rappel'
): number | null {
  try {
    const db = getDb();
    const dateStr = dateRappel.toISOString().split('T')[0];
    const heureStr = dateRappel.toTimeString().slice(0, 5);
    
    const result = db.runSync(
      `INSERT INTO Rappel (achatId, titre, message, dateRappel, heureRappel, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [achatId, titre, message, dateStr, heureStr, type]
    );
    
    console.log(`✅ Rappel créé: ID ${result.lastInsertRowId}`);
    return result.lastInsertRowId as number;
  } catch (error) {
    console.error('❌ Erreur création rappel:', error);
    return null;
  }
}

// ============================================================
// 📅 PROGRAMMER UN RAPPEL DE COURSES (fonction utilisée dans achat/[id])
// ============================================================

export async function scheduleShoppingReminder(
  listName: string,
  date: Date,
  achatId: number
): Promise<string | null> {
  try {
    const message = `N'oubliez pas d'aller faire vos courses: ${listName}`;
    
    const result = creerRappel(
      achatId,
      listName || 'Rappel courses',
      message,
      date,
      'rappel'
    );
    
    if (result) {
      console.log(`✅ Rappel programmé pour ${date.toLocaleString()}`);
      return String(result);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur programmation rappel:', error);
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
        a.nomListe,
        (SELECT COUNT(*) FROM LigneAchat WHERE idAchat = r.achatId) as nombreArticles
      FROM Rappel r
      LEFT JOIN Achat a ON r.achatId = a.id
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
    db.runSync('UPDATE Rappel SET lu = 1 WHERE id = ?', [rappelId]);
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// ============================================================
// ✅ MARQUER TOUT COMME LU
// ============================================================

export function marquerToutCommeLu(): void {
  try {
    const db = getDb();
    db.runSync('UPDATE Rappel SET lu = 1 WHERE supprime = 0');
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
    console.error('❌ Erreur:', error);
  }
}

// ============================================================
// ❌ ANNULER UN RAPPEL (par ID string)
// ============================================================

export async function cancelShoppingReminder(notificationId: string): Promise<void> {
  try {
    const id = parseInt(notificationId, 10);
    if (!isNaN(id)) {
      supprimerRappel(id);
    }
  } catch (error) {
    console.error('❌ Erreur annulation:', error);
  }
}

// ============================================================
// 🔢 COMPTER LES NON LUS
// ============================================================

export function getUnreadCount(): number {
  try {
    const db = getDb();
    const result = db.getAllSync(
      'SELECT COUNT(*) as count FROM Rappel WHERE lu = 0 AND supprime = 0'
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
      SELECT r.*, a.nomListe
      FROM Rappel r
      LEFT JOIN Achat a ON r.achatId = a.id
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
      'SELECT COUNT(*) as c FROM Rappel WHERE supprime = 0 AND lu = 0'
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
// 📋 OBTENIR LES RAPPELS PROGRAMMÉS
// ============================================================

export async function getScheduledReminders(): Promise<RappelItem[]> {
  return getRappels().filter(r => !r.isPast);
}

// ============================================================
// 🔄 FONCTIONS LEGACY (compatibilité)
// ============================================================

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  console.log('📱 [Expo Go] Permission simulée');
  return true;
}

export function areNotificationsAvailable(): boolean {
  return true;
}

// Alias pour compatibilité
export const getNotifications = getRappels;
export const supprimerNotification = supprimerRappel;
export const getUnreadNotificationCount = getUnreadCount;
export const marquerNotificationLue = marquerCommeLu;