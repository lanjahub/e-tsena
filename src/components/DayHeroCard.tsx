import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { HourlyData, ComparisonData } from '../services/journalService';
import formatMoney from '../utils/formatMoney';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayHeroCardProps {
  date: Date;
  totalAmount: number;
  evaluation: {
    label: string;
    color: string;
    emoji: string;
    score: number;
  };
  purchaseCount: number;
  vsYesterday: ComparisonData['vsYesterday'];
  areaChartData: HourlyData[];
  activeTheme: any;
  isDarkMode: boolean;
  currency: string;
  onViewDetails?: () => void;
}

const DayHeroCard: React.FC<DayHeroCardProps> = ({
  date,
  totalAmount,
  evaluation,
  purchaseCount,
  vsYesterday,
  areaChartData,
  activeTheme,
  isDarkMode,
  currency,
  onViewDetails,
}) => {
  const chartData = useMemo(() => {
    const maxValue = Math.max(...areaChartData.map(d => d.amount), 100);
    const chartWidth = SCREEN_WIDTH - 80;
    const chartHeight = 120;
    const points: { x: number; y: number }[] = [];

    areaChartData.forEach((data, index) => {
      const x = (index / 23) * chartWidth;
      const y = chartHeight - (data.amount / maxValue) * chartHeight;
      points.push({ x, y });
    });

    // Créer le path pour l'area chart
    if (points.length === 0) return { path: '', hasData: false };

    let path = `M 0,${chartHeight} `;
    path += `L ${points[0].x},${points[0].y} `;

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      const cpX = (prevPoint.x + currentPoint.x) / 2;
      path += `Q ${cpX},${prevPoint.y} ${currentPoint.x},${currentPoint.y} `;
    }

    path += `L ${chartWidth},${chartHeight} Z`;

    return { path, hasData: areaChartData.some(d => d.amount > 0), maxValue };
  }, [areaChartData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return '#EF4444';
      case 'down':
        return '#10B981';
      default:
        return isDarkMode ? '#64748B' : '#94A3B8';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }]}>
      {/* Header de la carte */}
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={[styles.month, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            {format(date, 'MMM.', { locale: fr }).toUpperCase()}
          </Text>
          <Text style={[styles.day, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
            {format(date, 'd')}
          </Text>
          <Text style={[styles.weekday, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            {format(date, 'EEE.', { locale: fr })}
          </Text>
        </View>

        <View style={styles.evaluationContainer}>
          <View style={styles.evaluationHeader}>
            <Text style={[styles.evaluationLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              Dépenses du jour
            </Text>
            {onViewDetails && (
              <TouchableOpacity onPress={onViewDetails}>
                <Ionicons name="chevron-forward" size={20} color={activeTheme.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.evaluationRow}>
            <Text style={[styles.evaluationText, { color: evaluation.color }]}>
              {evaluation.emoji} {evaluation.label}
            </Text>
            <Text style={[styles.amount, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
              {formatMoney(totalAmount)}
            </Text>
          </View>
          <Text style={[styles.currency, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            {currency}
          </Text>
          
          {/* Barre de score */}
          <View style={[styles.scoreBar, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' }]}>
            <LinearGradient
              colors={[evaluation.color, evaluation.color + '80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.scoreBarFill, { width: `${evaluation.score}%` }]}
            />
          </View>
        </View>
      </View>

      {/* Graphique Area Chart */}
      <View style={styles.chartContainer}>
        {chartData.hasData ? (
          <Svg width={SCREEN_WIDTH - 80} height={120}>
            <Defs>
              <SvgGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={activeTheme.primary} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={activeTheme.primary} stopOpacity="0.05" />
              </SvgGradient>
            </Defs>
            <Path d={chartData.path} fill="url(#areaGradient)" />
            <Path
              d={chartData.path.split('L')[0] + chartData.path.split('Z')[0].substring(chartData.path.indexOf('L'))}
              fill="none"
              stroke={activeTheme.primary}
              strokeWidth={2}
            />
          </Svg>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="analytics-outline" size={40} color={isDarkMode ? '#334155' : '#E5E7EB'} />
            <Text style={[styles.noDataText, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>
              Aucune donnée pour ce jour
            </Text>
          </View>
        )}

        {/* Labels des heures */}
        {chartData.hasData && (
          <View style={styles.hoursLabels}>
            <Text style={[styles.hourLabel, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>0h</Text>
            <Text style={[styles.hourLabel, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>6h</Text>
            <Text style={[styles.hourLabel, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>12h</Text>
            <Text style={[styles.hourLabel, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>18h</Text>
            <Text style={[styles.hourLabel, { color: isDarkMode ? '#64748B' : '#9CA3AF' }]}>23h</Text>
          </View>
        )}
      </View>

      {/* Footer avec statistiques */}
      <View style={styles.footer}>
        <View style={styles.statItem}>
          <Ionicons name="cart-outline" size={18} color={activeTheme.primary} />
          <Text style={[styles.statValue, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
            {purchaseCount}
          </Text>
          <Text style={[styles.statLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            {purchaseCount > 1 ? 'achats' : 'achat'}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: isDarkMode ? '#334155' : '#E5E7EB' }]} />

        <View style={styles.statItem}>
          <Ionicons
            name={getTrendIcon(vsYesterday.trend)}
            size={18}
            color={getTrendColor(vsYesterday.trend)}
          />
          <Text style={[styles.statValue, { color: getTrendColor(vsYesterday.trend) }]}>
            {vsYesterday.percentage >= 0 ? '+' : ''}
            {vsYesterday.percentage.toFixed(0)}%
          </Text>
          <Text style={[styles.statLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            vs hier
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateContainer: {
    marginRight: 20,
    alignItems: 'center',
  },
  month: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  day: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
    marginVertical: 2,
  },
  weekday: {
    fontSize: 12,
    fontWeight: '500',
  },
  evaluationContainer: {
    flex: 1,
  },
  evaluationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evaluationLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  evaluationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  evaluationText: {
    fontSize: 16,
    fontWeight: '700',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
  },
  currency: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    marginBottom: 20,
  },
  noDataContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 13,
    marginTop: 8,
  },
  hoursLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 30,
  },
});

export default DayHeroCard;
