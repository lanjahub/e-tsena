import { getDb } from '../db/init';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';

export interface DayData {
  date: Date;
  totalAmount: number;
  purchaseCount: number;
  purchases: Purchase[];
  hourlyDistribution: HourlyData[];
}

export interface Purchase {
  id: number;
  libelleProduit: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
  dateAchat: string;
  heureAchat: string;
}

export interface HourlyData {
  hour: number;
  amount: number;
}

export interface WeekDayData {
  day: number;
  date: Date;
  isToday: boolean;
  amount: number;
  purchaseCount: number;
  status: 'empty' | 'low' | 'medium' | 'high';
}

export interface ComparisonData {
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

export class JournalService {
  /**
   * Récupère toutes les données d'un jour spécifique
   */
  static async getDayData(date: Date): Promise<DayData> {
    const db = getDb();
    const startStr = format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss');
    const endStr = format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss');

    const purchases = db.getAllSync(
      `SELECT 
        a.idArticle as id,
        COALESCE(p.libelle, a.libelleProduit) as libelleProduit,
        a.quantite,
        a.prixUnitaire,
        a.prixTotal as montant,
        l.dateAchat,
        strftime('%H:%M', l.dateAchat) as heureAchat
      FROM Article a
      JOIN ListeAchat l ON a.idListeAchat = l.idListe
      LEFT JOIN Produit p ON a.idProduit = p.idProduit
      WHERE l.dateAchat >= ? AND l.dateAchat <= ?
      ORDER BY l.dateAchat DESC`,
      [startStr, endStr]
    ) as Purchase[];

    const totalAmount = purchases.reduce((sum, p) => sum + (p.montant || 0), 0);
    const hourlyDistribution = await this.getHourlyDistribution(date);

    return {
      date,
      totalAmount,
      purchaseCount: purchases.length,
      purchases: purchases || [],
      hourlyDistribution,
    };
  }

  /**
   * Récupère les données de la semaine actuelle (Lundi-Dimanche)
   */
  static async getCurrentWeekData(): Promise<WeekDayData[]> {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lundi
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Dimanche

    const days: WeekDayData[] = [];
    let currentDate = new Date(weekStart);

    while (currentDate <= weekEnd) {
      const dayData = await this.getDayData(currentDate);
      const status = this.calculateDayStatus(dayData.totalAmount);

      days.push({
        day: currentDate.getDate(),
        date: new Date(currentDate),
        isToday: format(currentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
        amount: dayData.totalAmount,
        purchaseCount: dayData.purchaseCount,
        status,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  /**
   * Compare les dépenses d'aujourd'hui avec hier et la moyenne
   */
  static async compareWithYesterday(today: Date): Promise<ComparisonData> {
    const todayData = await this.getDayData(today);
    const yesterday = subDays(today, 1);
    const yesterdayData = await this.getDayData(yesterday);

    // Calcul moyenne sur 7 derniers jours
    const weekData = await this.getCurrentWeekData();
    const weekTotal = weekData.reduce((sum, d) => sum + d.amount, 0);
    const average = weekTotal / 7;

    const calculateComparison = (current: number, previous: number) => {
      const difference = current - previous;
      const percentage = previous > 0 ? ((difference / previous) * 100) : 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentage) < 5) trend = 'stable';
      else trend = difference > 0 ? 'up' : 'down';
      return { difference, percentage, trend };
    };

    return {
      vsYesterday: calculateComparison(todayData.totalAmount, yesterdayData.totalAmount),
      vsAverage: calculateComparison(todayData.totalAmount, average),
      weekTotal,
    };
  }

  /**
   * Distribution horaire des achats pour le graphique area chart
   */
  static async getHourlyDistribution(date: Date): Promise<HourlyData[]> {
    const db = getDb();
    const startStr = format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss');
    const endStr = format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss');

    const hourlyData = db.getAllSync(
      `SELECT 
        CAST(strftime('%H', l.dateAchat) AS INTEGER) as hour,
        SUM(a.prixTotal) as amount
      FROM Article a
      JOIN ListeAchat l ON a.idListeAchat = l.idListe
      WHERE l.dateAchat >= ? AND l.dateAchat <= ?
      GROUP BY hour
      ORDER BY hour`,
      [startStr, endStr]
    ) as { hour: number; amount: number }[];

    // Remplir toutes les heures (0-23) avec 0 si pas de données
    const hours: HourlyData[] = [];
    for (let h = 0; h < 24; h++) {
      const found = hourlyData.find(d => d.hour === h);
      hours.push({
        hour: h,
        amount: found ? found.amount : 0,
      });
    }

    return hours;
  }

  /**
   * Évalue le statut du jour basé sur le montant
   */
  private static calculateDayStatus(amount: number): 'empty' | 'low' | 'medium' | 'high' {
    if (amount === 0) return 'empty';
    if (amount < 500) return 'low';
    if (amount < 1500) return 'medium';
    return 'high';
  }

  /**
   * Récupère les statistiques de la semaine pour affichage
   */
  static async getWeekStats() {
    const weekData = await this.getCurrentWeekData();
    const amounts = weekData.map(d => d.amount);
    const total = amounts.reduce((sum, a) => sum + a, 0);
    const max = Math.max(...amounts);
    const min = Math.min(...amounts.filter(a => a > 0)); // Exclure les zéros
    const avg = total / weekData.length;

    return {
      total,
      max,
      min: isFinite(min) ? min : 0,
      avg,
      days: weekData,
    };
  }
}
