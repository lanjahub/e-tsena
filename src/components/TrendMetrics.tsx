import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import formatMoney from '../utils/formatMoney';

interface Metric {
  label: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  change?: string;
  icon?: any;
  suffix?: string;
}

interface TrendMetricsProps {
  metrics: Metric[];
  activeTheme: any;
  isDarkMode: boolean;
  layout?: 'horizontal' | 'vertical';
}

const TrendMetrics: React.FC<TrendMetricsProps> = ({
  metrics,
  activeTheme,
  isDarkMode,
  layout = 'horizontal',
}) => {
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

  const renderMetric = (metric: Metric, index: number) => {
    const trendColor = getTrendColor(metric.trend);
    const isNumeric = typeof metric.value === 'number';

    return (
      <View
        key={index}
        style={[
          styles.metricCard,
          { backgroundColor: isDarkMode ? '#1E293B' : '#fff' },
          layout === 'vertical' && styles.metricCardVertical,
        ]}
      >
        {/* Icon Badge */}
        {metric.icon && (
          <View style={[styles.iconBadge, { backgroundColor: activeTheme.primary + '20' }]}>
            <Ionicons name={metric.icon} size={20} color={activeTheme.primary} />
          </View>
        )}

        {/* Label */}
        <Text style={[styles.metricLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          {metric.label}
        </Text>

        {/* Value avec tendance */}
        <View style={styles.valueRow}>
          <Text style={[styles.metricValue, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
            {isNumeric ? formatMoney(metric.value as number) : metric.value}
            {metric.suffix && (
              <Text style={[styles.suffix, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                {' '}{metric.suffix}
              </Text>
            )}
          </Text>
          <Ionicons name={getTrendIcon(metric.trend)} size={20} color={trendColor} />
        </View>

        {/* Change percentage */}
        {metric.change && (
          <View style={[styles.changeBadge, { backgroundColor: trendColor + '20' }]}>
            <Text style={[styles.changeText, { color: trendColor }]}>{metric.change}</Text>
          </View>
        )}

        {/* Barre de progression (optionnelle pour les tendances) */}
        {metric.trend !== 'stable' && (
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' }]}>
            <LinearGradient
              colors={[trendColor, trendColor + '80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                {
                  width: metric.change
                    ? `${Math.min(Math.abs(parseFloat(metric.change)), 100)}%`
                    : '50%',
                },
              ]}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, layout === 'vertical' && styles.containerVertical]}>
      {metrics.map((metric, index) => renderMetric(metric, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  containerVertical: {
    flexDirection: 'column',
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricCardVertical: {
    flex: 0,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  suffix: {
    fontSize: 12,
    fontWeight: '500',
  },
  changeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default TrendMetrics;
