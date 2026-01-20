import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import formatMoney from '../utils/formatMoney';

interface WeekDayData {
  date: Date;
  dayName: string;
  dayNumber: string;
  amount: number;
  hasData: boolean;
  isToday: boolean;
  listCount: number;
}

interface Props {
  data: WeekDayData[];
  onDayPress: (day: WeekDayData) => void;
  activeTheme: any;
  isDarkMode: boolean;
  selectedDay?: WeekDayData;
}

export default function WeekCalendarCircles({ data, onDayPress, activeTheme, isDarkMode, selectedDay }: Props) {
  const getCircleStyle = (day: WeekDayData) => {
    const isSelected = selectedDay && 
      selectedDay.date.toDateString() === day.date.toDateString();
    
    if (isSelected) {
      return {
        backgroundColor: activeTheme.primary,
        borderColor: activeTheme.primary,
      };
    }
    
    if (day.isToday) {
      return {
        backgroundColor: activeTheme.primary + '20',
        borderColor: activeTheme.primary,
        borderWidth: 2,
      };
    }
    
    if (day.hasData) {
      return {
        backgroundColor: isDarkMode ? '#334155' : '#E5E7EB',
        borderColor: 'transparent',
      };
    }
    
    return {
      backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
      borderColor: isDarkMode ? '#334155' : '#E5E7EB',
    };
  };

  const getTextColor = (day: WeekDayData) => {
    const isSelected = selectedDay && 
      selectedDay.date.toDateString() === day.date.toDateString();
    
    if (isSelected) return '#FFFFFF';
    if (day.isToday) return activeTheme.primary;
    return isDarkMode ? '#F1F5F9' : '#1E293B';
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>
        Cette semaine
      </Text>
      <View style={styles.daysRow}>
        {data.map((day, index) => {
          const isSelected = selectedDay && 
            selectedDay.date.toDateString() === day.date.toDateString();
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.dayContainer}
              onPress={() => onDayPress(day)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayName, 
                { color: isDarkMode ? '#94A3B8' : '#64748B' }
              ]}>
                {day.dayName}
              </Text>
              <View style={[styles.circle, getCircleStyle(day)]}>
                <Text style={[styles.dayNumber, { color: getTextColor(day) }]}>
                  {day.dayNumber}
                </Text>
              </View>
              {day.hasData && (
                <View style={[styles.indicator, { backgroundColor: activeTheme.primary }]} />
              )}
              {isSelected && day.amount > 0 && (
                <Text style={[styles.amount, { color: activeTheme.primary }]} numberOfLines={1}>
                  {formatMoney(day.amount / 1000)}K
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  amount: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },
});