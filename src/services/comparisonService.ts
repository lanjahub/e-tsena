import { getDb } from '../db/init';
import { format } from 'date-fns';

export interface AdvancedMetrics {
  totalQuantity: number;
  avgUnitPrice: number;
  totalAmount: number;
  purchaseCount: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
  topProducts: ProductMetric[];
}

export interface ProductMetric {
  libelleProduit: string;
  totalQuantity: number;
  totalAmount: number;
  purchaseCount: number;
  avgPrice: number;
}

export interface PeriodComparison {
  current: AdvancedMetrics;
  previous: AdvancedMetrics;
  evolution: {
    quantity: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    avgUnitPrice: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    totalAmount: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
  };
}

export class ComparisonService {
  /**
   * Calcule les métriques avancées pour une période donnée
   */
  static async getAdvancedMetrics(startDate: Date, endDate: Date): Promise<AdvancedMetrics> {
    const db = getDb();
    const startStr = format(startDate, 'yyyy-MM-dd 00:00:00');
    const endStr = format(endDate, 'yyyy-MM-dd 23:59:59');

    // Métriques générales
    const generalStats = db.getFirstSync(
      `SELECT 
        SUM(a.quantite) as totalQuantity,
        SUM(a.prixTotal) as totalAmount,
        COUNT(*) as purchaseCount,
        AVG(a.prixUnitaire) as avgUnitPrice
      FROM Article a
      JOIN ListeAchat l ON a.idListeAchat = l.idListe
      WHERE l.dateAchat >= ? AND l.dateAchat <= ?`,
      [startStr, endStr]
    ) as {
      totalQuantity: number;
      totalAmount: number;
      purchaseCount: number;
      avgUnitPrice: number;
    } | null;

    // Top produits
    const topProducts = db.getAllSync(
      `SELECT 
        COALESCE(p.libelle, a.libelleProduit) as libelleProduit,
        SUM(a.quantite) as totalQuantity,
        SUM(a.prixTotal) as totalAmount,
        COUNT(*) as purchaseCount,
        AVG(a.prixUnitaire) as avgPrice
      FROM Article a
      JOIN ListeAchat l ON a.idListeAchat = l.idListe
      LEFT JOIN Produit p ON a.idProduit = p.idProduit
      WHERE l.dateAchat >= ? AND l.dateAchat <= ?
      GROUP BY COALESCE(p.idProduit, a.libelleProduit)
      ORDER BY totalAmount DESC
      LIMIT 5`,
      [startStr, endStr]
    ) as ProductMetric[];

    return {
      totalQuantity: generalStats?.totalQuantity || 0,
      avgUnitPrice: generalStats?.avgUnitPrice || 0,
      totalAmount: generalStats?.totalAmount || 0,
      purchaseCount: generalStats?.purchaseCount || 0,
      trend: 'stable',
      percentChange: 0,
      topProducts: topProducts || [],
    };
  }

  /**
   * Compare deux périodes (ex: semaine actuelle vs semaine précédente)
   */
  static async comparePeriods(
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<PeriodComparison> {
    const current = await this.getAdvancedMetrics(currentStart, currentEnd);
    const previous = await this.getAdvancedMetrics(previousStart, previousEnd);

    const calculateEvolution = (currentVal: number, previousVal: number) => {
      const value = currentVal - previousVal;
      const percentage = previousVal > 0 ? ((value / previousVal) * 100) : 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentage) < 5) trend = 'stable';
      else trend = value > 0 ? 'up' : 'down';
      return { value, percentage, trend };
    };

    return {
      current,
      previous,
      evolution: {
        quantity: calculateEvolution(current.totalQuantity, previous.totalQuantity),
        avgUnitPrice: calculateEvolution(current.avgUnitPrice, previous.avgUnitPrice),
        totalAmount: calculateEvolution(current.totalAmount, previous.totalAmount),
      },
    };
  }

  /**
   * Calcule la tendance sur plusieurs périodes
   */
  static async calculateTrend(periods: { start: Date; end: Date }[]): Promise<'up' | 'down' | 'stable'> {
    const metrics = await Promise.all(
      periods.map(p => this.getAdvancedMetrics(p.start, p.end))
    );

    const amounts = metrics.map(m => m.totalAmount);
    
    // Régression linéaire simple
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = amounts.length;

    amounts.forEach((amount, index) => {
      sumX += index;
      sumY += amount;
      sumXY += index * amount;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (Math.abs(slope) < 50) return 'stable';
    return slope > 0 ? 'up' : 'down';
  }

  /**
   * Détecte les anomalies de dépenses (jours exceptionnels)
   */
  static async detectAnomalies(startDate: Date, endDate: Date): Promise<Date[]> {
    const db = getDb();
    const startStr = format(startDate, 'yyyy-MM-dd 00:00:00');
    const endStr = format(endDate, 'yyyy-MM-dd 23:59:59');

    const dailyAmounts = db.getAllSync(
      `SELECT 
        DATE(l.dateAchat) as date,
        SUM(a.prixTotal) as amount
      FROM Article a
      JOIN ListeAchat l ON a.idListeAchat = l.idListe
      WHERE l.dateAchat >= ? AND l.dateAchat <= ?
      GROUP BY DATE(l.dateAchat)`,
      [startStr, endStr]
    ) as { date: string; amount: number }[];

    if (dailyAmounts.length < 3) return [];

    const amounts = dailyAmounts.map(d => d.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Détection: > 2 écarts-types de la moyenne
    const anomalyDates: Date[] = [];
    dailyAmounts.forEach(d => {
      if (Math.abs(d.amount - mean) > 2 * stdDev) {
        anomalyDates.push(new Date(d.date));
      }
    });

    return anomalyDates;
  }

  /**
   * Évalue les performances d'une période
   */
  static evaluatePerformance(
    amount: number,
    average: number
  ): { label: string; color: string; emoji: string; score: number } {
    const ratio = average > 0 ? amount / average : 1;
    const score = Math.round(Math.max(0, Math.min(100, (1 / ratio) * 100)));

    if (ratio < 0.7) {
      return { label: 'Excellent', color: '#10B981', emoji: '💚', score };
    }
    if (ratio < 1.0) {
      return { label: 'Bon', color: '#3B82F6', emoji: '💙', score };
    }
    if (ratio < 1.3) {
      return { label: 'Modéré', color: '#F59E0B', emoji: '⚠️', score };
    }
    if (ratio < 1.7) {
      return { label: 'Élevé', color: '#EF4444', emoji: '🔥', score };
    }
    return { label: 'Très élevé', color: '#DC2626', emoji: '🚨', score };
  }
}
