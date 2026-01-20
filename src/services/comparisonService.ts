export interface PerformanceEvaluation {
  status: 'excellent' | 'good' | 'normal' | 'warning' | 'high';
  message: string;
  icon: string;
  color: string;
}

export const ComparisonService = {
  /**
   * Évalue la performance basée sur le montant vs la moyenne
   */
  evaluatePerformance: (amount: number, average: number): PerformanceEvaluation => {
    if (average === 0) {
      if (amount === 0) {
        return {
          status: 'normal',
          message: 'Aucune dépense',
          icon: 'remove-circle-outline',
          color: '#6B7280',
        };
      }
      return {
        status: 'normal',
        message: 'Première dépense',
        icon: 'add-circle-outline',
        color: '#3B82F6',
      };
    }

    const ratio = amount / average;

    if (ratio <= 0.5) {
      return {
        status: 'excellent',
        message: 'Excellent ! Bien en dessous de la moyenne',
        icon: 'trending-down',
        color: '#10B981',
      };
    } else if (ratio <= 0.8) {
      return {
        status: 'good',
        message: 'Très bien ! En dessous de la moyenne',
        icon: 'thumbs-up',
        color: '#22C55E',
      };
    } else if (ratio <= 1.2) {
      return {
        status: 'normal',
        message: 'Normal, proche de la moyenne',
        icon: 'remove-circle-outline',
        color: '#F59E0B',
      };
    } else if (ratio <= 1.5) {
      return {
        status: 'warning',
        message: 'Attention, au-dessus de la moyenne',
        icon: 'alert-circle-outline',
        color: '#F97316',
      };
    } else {
      return {
        status: 'high',
        message: 'Dépenses élevées aujourd\'hui',
        icon: 'trending-up',
        color: '#FFFFFF',
      };
    }
  },

  /**
   * Calcule le pourcentage de variation
   */
  calculateVariation: (current: number, previous: number): { percentage: number; trend: 'up' | 'down' | 'stable' } => {
    if (previous === 0) {
      return { percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'stable' };
    }

    const variation = ((current - previous) / previous) * 100;
    
    return {
      percentage: Math.abs(variation),
      trend: variation > 5 ? 'up' : variation < -5 ? 'down' : 'stable',
    };
  },
};