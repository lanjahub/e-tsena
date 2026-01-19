import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { WeekDayData } from '../services/journalService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WeekCalendarCirclesProps {
  data: WeekDayData[];
  onDayPress: (day: WeekDayData) => void;
  activeTheme: any;
  isDarkMode: boolean;
  selectedDay?: WeekDayData | null;
}

const WeekCalendarCircles: React.FC<WeekCalendarCirclesProps> = ({
  data,
  onDayPress,
  activeTheme,
  isDarkMode,
  selectedDay,
}) => {
  const circleSize = 55;
  const circleRadius = 22;

  const getStatusColor = (status: string, isToday: boolean, isSelected: boolean) => {
    if (isSelected) return activeTheme.primary;
    if (isToday) return activeTheme.secondary;
    
    switch (status) {
      case 'empty':
        return isDarkMode ? '#334155' : '#E5E7EB';
      case 'low':
        return isDarkMode ? '#3B82F6' : '#60A5FA';
      case 'medium':
        return isDarkMode ? '#8B5CF6' : '#A78BFA';
      case 'high':
        return isDarkMode ? '#EF4444' : '#F87171';
      default:
        return isDarkMode ? '#64748B' : '#CBD5E1';
    }
  };

  const getIntensity = (amount: number, maxAmount: number) => {
    if (amount === 0) return 0.2;
    const ratio = amount / maxAmount;
    return Math.max(0.3, Math.min(1, ratio));
  };

  const maxAmount = useMemo(() => Math.max(...data.map(d => d.amount), 1), [data]);

  return (
    <View style={styles.container}>
      {/* Labels des jours */}
      <View style={styles.labelsRow}>
        {data.map((day, index) => (
          <View key={index} style={styles.labelContainer}>
            <Text style={[styles.dayLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
              {format(day.date, 'EEE', { locale: fr }).toUpperCase().substring(0, 3)}
            </Text>
          </View>
        ))}
      </View>

      {/* Cercles avec chiffres */}
      <View style={styles.circlesRow}>
        {data.map((day, index) => {
          const isSelected = selectedDay?.day === day.day && 
                           format(selectedDay.date, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd');
          const color = getStatusColor(day.status, day.isToday, isSelected);
          const intensity = getIntensity(day.amount, maxAmount);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDayPress(day)}
              activeOpacity={0.7}
              style={styles.circleContainer}
            >
              <Svg width={circleSize} height={circleSize}>
                {/* Cercle de fond */}
                <Circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={circleRadius}
                  fill={isDarkMode ? '#1E293B' : '#F8FAFC'}
                  stroke={color}
                  strokeWidth={3}
                  opacity={0.3}
                />
                
                {/* Cercle de progression */}
                <Circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={circleRadius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={3}
                  strokeDasharray={`${2 * Math.PI * circleRadius * intensity} ${2 * Math.PI * circleRadius}`}
                  strokeDashoffset={-Math.PI * circleRadius / 2}
                  strokeLinecap="round"
                />

                {/* Numéro du jour */}
                <SvgText
                  x={circleSize / 2}
                  y={circleSize / 2}
                  fontSize={16}
                  fontWeight="bold"
                  fill={day.isToday || isSelected ? color : (isDarkMode ? '#F1F5F9' : '#1E293B')}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {day.day}
                </SvgText>
              </Svg>

              {/* Badge pour aujourd'hui */}
              {day.isToday && !isSelected && (
                <View style={[styles.todayBadge, { backgroundColor: activeTheme.secondary }]}>
                  <Text style={styles.todayBadgeText}>•</Text>
                </View>
              )}

              {/* Badge pour jour sélectionné */}
              {isSelected && (
                <View style={[styles.selectedBadge, { backgroundColor: activeTheme.primary }]}>
                  <Text style={styles.selectedBadgeText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Indicateur de légende */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: isDarkMode ? '#3B82F6' : '#60A5FA' }]} />
          <Text style={[styles.legendText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Faible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: isDarkMode ? '#8B5CF6' : '#A78BFA' }]} />
          <Text style={[styles.legendText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Moyen</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: isDarkMode ? '#EF4444' : '#F87171' }]} />
          <Text style={[styles.legendText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Élevé</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  labelContainer: {
    width: 55,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayBadge: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadgeText: {
    fontSize: 6,
    color: '#fff',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default WeekCalendarCircles;
