import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import formatMoney from '../utils/formatMoney';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DataPoint {
  label: string;
  value: number;
  date: Date;
  fullLabel?: string;
}

interface BarChartComparisonProps {
  data: DataPoint[];
  maxValue: number;
  minValue: number;
  avgValue: number;
  type: 'week' | 'month';
  activeTheme: any;
  isDarkMode: boolean;
  currency: string;
  onBarPress?: (item: DataPoint) => void;
}

const BarChartComparison: React.FC<BarChartComparisonProps> = ({
  data,
  maxValue,
  minValue,
  avgValue,
  type,
  activeTheme,
  isDarkMode,
  currency,
  onBarPress,
}) => {
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 200;
  const barWidth = type === 'week' ? 35 : 20;
  const barSpacing = type === 'week' ? 10 : 5;
  const paddingLeft = 10;
  const paddingBottom = 30;

  const chartData = useMemo(() => {
    return data.map((item, index) => {
      const x = paddingLeft + index * (barWidth + barSpacing);
      const barHeight = maxValue > 0 ? (item.value / maxValue) * (chartHeight - paddingBottom) : 0;
      const y = chartHeight - paddingBottom - barHeight;
      
      return {
        ...item,
        x,
        y,
        barHeight,
        isToday: format(item.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      };
    });
  }, [data, maxValue, chartHeight, barWidth, barSpacing]);

  const avgY = chartHeight - paddingBottom - (avgValue / maxValue) * (chartHeight - paddingBottom);

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Max</Text>
          <Text style={[styles.statValue, { color: activeTheme.primary }]}>
            {formatMoney(maxValue)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Min</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {formatMoney(minValue)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Moy</Text>
          <Text style={[styles.statValue, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
            {formatMoney(avgValue)}
          </Text>
        </View>
      </View>

      {/* Chart SVG */}
      <Svg width={chartWidth} height={chartHeight} style={styles.chart}>
        <Defs>
          {chartData.map((item, index) => (
            <SvgGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop
                offset="0%"
                stopColor={item.isToday ? activeTheme.secondary : activeTheme.primary}
                stopOpacity="1"
              />
              <Stop
                offset="100%"
                stopColor={item.isToday ? activeTheme.secondary : activeTheme.primary}
                stopOpacity="0.6"
              />
            </SvgGradient>
          ))}
        </Defs>

        {/* Ligne de moyenne */}
        <Line
          x1={0}
          y1={avgY}
          x2={chartWidth}
          y2={avgY}
          stroke={isDarkMode ? '#64748B' : '#94A3B8'}
          strokeWidth={1}
          strokeDasharray="5,5"
        />
        <SvgText
          x={chartWidth - 5}
          y={avgY - 5}
          fontSize={10}
          fill={isDarkMode ? '#64748B' : '#94A3B8'}
          textAnchor="end"
        >
          Moy
        </SvgText>

        {/* Barres */}
        {chartData.map((item, index) => (
          <React.Fragment key={`bar-${index}`}>
            <Rect
              x={item.x}
              y={item.y}
              width={barWidth}
              height={item.barHeight}
              fill={`url(#barGradient-${index})`}
              rx={6}
              ry={6}
            />
            
            {/* Label du jour */}
            <SvgText
              x={item.x + barWidth / 2}
              y={chartHeight - 15}
              fontSize={11}
              fontWeight={item.isToday ? 'bold' : 'normal'}
              fill={item.isToday ? activeTheme.secondary : (isDarkMode ? '#94A3B8' : '#64748B')}
              textAnchor="middle"
            >
              {item.label}
            </SvgText>

            {/* Valeur au-dessus de la barre */}
            {item.value > 0 && (
              <SvgText
                x={item.x + barWidth / 2}
                y={item.y - 5}
                fontSize={10}
                fontWeight="600"
                fill={isDarkMode ? '#F1F5F9' : '#1E293B'}
                textAnchor="middle"
              >
                {formatMoney(item.value)}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>

      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: activeTheme.primary }]} />
          <Text style={[styles.legendText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            {type === 'week' ? 'Jour normal' : 'Jour'}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: activeTheme.secondary }]} />
          <Text style={[styles.legendText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Aujourd'hui
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  chart: {
    marginVertical: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default BarChartComparison;
