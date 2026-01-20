// src/services/journalService.ts
import { getDb } from '../db/init';
import { format, startOfWeek, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface WeekDayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  amount: number;
  hasData: boolean;
  isToday: boolean;
  listCount: number;
}

export interface JournalList {
  id: number;
  name: string;
  amount: number;
  itemCount: number;
  status: number;
  dateAchat: string;
}

export interface DayData {
  date: Date;
  totalAmount: number;
  listCount: number;
  lists: JournalList[];
  hourlyDistribution: { hour: number; amount: number }[];
}

export interface ComparisonResult {
  vsYesterday: {
    difference: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  vsAverage: {
    difference: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  weekTotal: number;
}

// Fonction pour obtenir le total d'une date (flexible sur le format)
const getTotalForDate = (db: any, dateStr: string): { amount: number; count: number } => {
  try {
    // Essayer plusieurs formats de date
    const result = db.getFirstSync(`
      SELECT 
        COALESCE(SUM(a.prixTotal), 0) as totalAmount,
        COUNT(DISTINCT l.idListe) as listCount
      FROM ListeAchat l
      LEFT JOIN Article a ON l.idListe = a.idListeAchat
      WHERE date(l.dateAchat) = ? 
         OR l.dateAchat LIKE ?
         OR substr(l.dateAchat, 1, 10) = ?
    `, [dateStr, dateStr + '%', dateStr]) as any;
    
    return {
      amount: result?.totalAmount || 0,
      count: result?.listCount || 0,
    };
  } catch (e) {
    console.error('[JOURNAL] getTotalForDate error:', e);
    return { amount: 0, count: 0 };
  }
};

export const JournalService = {
  getCurrentWeekData: async (): Promise<WeekDayData[]> => {
    try {
      const db = getDb();
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekData: WeekDayData[] = [];

      console.log('[JOURNAL] Loading week data...');

      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(weekStart, i);
        const dateStr = format(currentDay, 'yyyy-MM-dd');
        
        const { amount, count } = getTotalForDate(db, dateStr);

        weekData.push({
          date: currentDay,
          dayName: format(currentDay, 'EEE', { locale: fr }),
          dayNumber: format(currentDay, 'd'),
          amount: amount,
          hasData: amount > 0 || count > 0,
          isToday: dateStr === format(today, 'yyyy-MM-dd'),
          listCount: count,
        });
      }

      console.log('[JOURNAL] Week data loaded:', weekData.map(d => ({ day: d.dayName, amount: d.amount, count: d.listCount })));
      return weekData;
    } catch (error) {
      console.error('[JOURNAL] getCurrentWeekData error:', error);
      return [];
    }
  },

  getWeekStats: async (): Promise<{ total: number; avg: number; max: number; min: number }> => {
    try {
      const db = getDb();
      
      // Récupérer TOUTES les données pour calculer les stats
      const result = db.getFirstSync(`
        SELECT COALESCE(SUM(a.prixTotal), 0) as total
        FROM ListeAchat l
        LEFT JOIN Article a ON l.idListe = a.idListeAchat
        WHERE l.dateAchat >= date('now', '-7 days')
      `) as any;

      const total = result?.total || 0;
      
      console.log('[JOURNAL] Week stats - total:', total);
      return { total, avg: total / 7, max: total, min: 0 };
    } catch (error) {
      console.error('[JOURNAL] getWeekStats error:', error);
      return { total: 0, avg: 0, max: 0, min: 0 };
    }
  },

  getDayData: async (date: Date): Promise<DayData> => {
    try {
      const db = getDb();
      const dateStr = format(date, 'yyyy-MM-dd');

      console.log('[JOURNAL] Loading day:', dateStr);

      // Requête flexible sur le format de date
      const lists = db.getAllSync(`
        SELECT 
          l.idListe as id,
          l.nomListe as name,
          l.dateAchat,
          COALESCE(SUM(a.prixTotal), 0) as amount,
          COUNT(a.idArticle) as itemCount
        FROM ListeAchat l
        LEFT JOIN Article a ON l.idListe = a.idListeAchat
        WHERE date(l.dateAchat) = ? 
           OR l.dateAchat LIKE ?
           OR substr(l.dateAchat, 1, 10) = ?
        GROUP BY l.idListe
        ORDER BY l.dateAchat DESC
      `, [dateStr, dateStr + '%', dateStr]) as any[];

      console.log('[JOURNAL] Found', lists.length, 'lists for', dateStr);

      const mappedLists: JournalList[] = lists.map(l => ({
        id: l.id,
        name: l.name || 'Sans nom',
        amount: l.amount || 0,
        itemCount: l.itemCount || 0,
        status: 1,
        dateAchat: l.dateAchat || '',
      }));

      const totalAmount = mappedLists.reduce((sum, l) => sum + l.amount, 0);

      return {
        date,
        totalAmount,
        listCount: mappedLists.length,
        lists: mappedLists,
        hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({ hour: h, amount: 0 })),
      };
    } catch (error) {
      console.error('[JOURNAL] getDayData error:', error);
      return {
        date,
        totalAmount: 0,
        listCount: 0,
        lists: [],
        hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({ hour: h, amount: 0 })),
      };
    }
  },

  compareWithYesterday: async (date: Date): Promise<ComparisonResult> => {
    try {
      const db = getDb();
      const dateStr = format(date, 'yyyy-MM-dd');
      const yesterdayDate = new Date(date);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

      const { amount: todayTotal } = getTotalForDate(db, dateStr);
      const { amount: yesterdayTotal } = getTotalForDate(db, yesterdayStr);

      // Total semaine
      const weekResult = db.getFirstSync(`
        SELECT COALESCE(SUM(a.prixTotal), 0) as total
        FROM ListeAchat l
        LEFT JOIN Article a ON l.idListe = a.idListeAchat
        WHERE l.dateAchat >= date('now', '-7 days')
      `) as any;
      const weekTotal = weekResult?.total || 0;
      const weekAvg = weekTotal / 7;

      const vsDiff = todayTotal - yesterdayTotal;
      const vsPct = yesterdayTotal > 0 ? (vsDiff / yesterdayTotal) * 100 : 0;
      const vsAvgDiff = todayTotal - weekAvg;
      const vsAvgPct = weekAvg > 0 ? (vsAvgDiff / weekAvg) * 100 : 0;

      return {
        vsYesterday: {
          difference: vsDiff,
          percentage: vsPct,
          trend: vsDiff > 0 ? 'up' : vsDiff < 0 ? 'down' : 'stable',
        },
        vsAverage: {
          difference: vsAvgDiff,
          percentage: vsAvgPct,
          trend: vsAvgDiff > 0 ? 'up' : vsAvgDiff < 0 ? 'down' : 'stable',
        },
        weekTotal,
      };
    } catch (error) {
      console.error('[JOURNAL] Compare error:', error);
      return {
        vsYesterday: { difference: 0, percentage: 0, trend: 'stable' },
        vsAverage: { difference: 0, percentage: 0, trend: 'stable' },
        weekTotal: 0,
      };
    }
  },

  // NOUVELLE FONCTION : Récupérer TOUTES les listes (pour debug)
  getAllLists: async (): Promise<JournalList[]> => {
    try {
      const db = getDb();
      const lists = db.getAllSync(`
        SELECT 
          l.idListe as id,
          l.nomListe as name,
          l.dateAchat,
          COALESCE(SUM(a.prixTotal), 0) as amount,
          COUNT(a.idArticle) as itemCount
        FROM ListeAchat l
        LEFT JOIN Article a ON l.idListe = a.idListeAchat
        GROUP BY l.idListe
        ORDER BY l.dateAchat DESC
        LIMIT 50
      `) as any[];

      console.log('[JOURNAL] All lists:', lists.length);
      return lists.map(l => ({
        id: l.id,
        name: l.name || 'Sans nom',
        amount: l.amount || 0,
        itemCount: l.itemCount || 0,
        status: 1,
        dateAchat: l.dateAchat || '',
      }));
    } catch (error) {
      console.error('[JOURNAL] getAllLists error:', error);
      return [];
    }
  },
};