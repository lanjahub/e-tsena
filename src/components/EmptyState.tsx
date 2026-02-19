import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = 'folder-open-outline' }: Props) {
  const { isDarkMode, activeTheme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[
        styles.iconContainer,
        { 
          backgroundColor: isDarkMode ? activeTheme.primaryDark + '20' : activeTheme.primary + '10',
          borderColor: activeTheme.primary + '30',
        }
      ]}>
        <Ionicons 
          name={icon as any} 
          size={48} 
          color={activeTheme.primary} 
        />
      </View>
      <Text style={[styles.title, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
        {title}
      </Text>
      {message && (
        <Text style={[styles.message, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});