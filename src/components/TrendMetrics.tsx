import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import formatMoney from '../utils/formatMoney';

interface Metric {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
  icon: string;
  suffix?: string;
}

interface Props {
  metrics: Metric[];
  activeTheme: any;
  isDarkMode: boolean;
}

export default function TrendMetrics({ metrics, activeTheme, isDarkMode }: Props) {
  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up': return '#EF4444';
      case 'down': return '#10B981';
      default: return '#F59E0B';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return 'arrow-up';
      case 'down': return 'arrow-down';
      default: return 'remove';
    }
  };

  return (
    <View style={styles.container}>
      {metrics.map((metric, index) => (
        <View 
          key={index} 
          style={[
            styles.metricCard,
            { 
              backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
              borderColor: isDarkMode ? '#334155' : '#E5E7EB',
            }
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: activeTheme.primary + '20' }]}>
            <Ionicons name={metric.icon as any} size={20} color={activeTheme.primary} />
          </View>
          
          <Text style={[styles.label, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            {metric.label}
          </Text>
          
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
              {formatMoney(metric.value)}
            </Text>
            {metric.suffix && (
              <Text style={[styles.suffix, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                {metric.suffix}
              </Text>
            )}
          </View>
          
          {metric.change && metric.trend && (
            <View style={[styles.changeBadge, { backgroundColor: getTrendColor(metric.trend) + '20' }]}>
              <Ionicons 
                name={getTrendIcon(metric.trend)} 
                size={12} 
                color={getTrendColor(metric.trend)} 
              />
              <Text style={[styles.changeText, { color: getTrendColor(metric.trend) }]}>
                {metric.change}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
  },
  suffix: {
    fontSize: 10,
    marginLeft: 3,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});