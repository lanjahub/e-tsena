import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import formatMoney from '../utils/formatMoney';

interface Props {
  date: Date;
  totalAmount: number;
  evaluation: {
    status: string;
    message: string;
    icon: string;
    color: string;
  };
  purchaseCount: number;
  vsYesterday: {
    difference: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  areaChartData?: { hour: number; amount: number }[];
  activeTheme: any;
  isDarkMode: boolean;
  currency: string;
}

export default function DayHeroCard({
  date,
  totalAmount,
  evaluation,
  purchaseCount,
  vsYesterday,
  activeTheme,
  isDarkMode,
  currency,
}: Props) {
  const getTrendIcon = () => {
    switch (vsYesterday.trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (vsYesterday.trend) {
      case 'up': return '#FFFFFF';
      case 'down': return '#FFFFFF';
      default: return '#FFFFFF';
    }
  };

  return (
    <LinearGradient
      colors={activeTheme.gradient as [string, string, ...string[]]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Date */}
      <Text style={styles.dateText}>
        {format(date, 'EEEE d MMMM', { locale: fr })}
      </Text>

      {/* Montant principal */}
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>{formatMoney(totalAmount)}</Text>
        <Text style={styles.currency}>{currency}</Text>
      </View>

      {/* Évaluation */}
      <View style={[styles.evaluationBadge, { backgroundColor: evaluation.color + '30' }]}>
        <Ionicons name={evaluation.icon as any} size={16} color={evaluation.color} />
        <Text style={[styles.evaluationText, { color: evaluation.color }]}>
          {evaluation.message}
        </Text>
      </View>

      {/* Stats rapides */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="cart-outline" size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statValue}>{purchaseCount}</Text>
          <Text style={styles.statLabel}>Listes</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name={getTrendIcon()} size={18} color={getTrendColor()} />
          <Text style={[styles.statValue, { color: getTrendColor() }]}>
            {vsYesterday.percentage >= 0 ? '+' : ''}{vsYesterday.percentage.toFixed(0)}%
          </Text>
          <Text style={styles.statLabel}>vs Hier</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  amount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
  },
  currency: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  evaluationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  evaluationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
});