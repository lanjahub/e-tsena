import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Composants d'icônes optimisés
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="home" color={color} size={size} />
);

const ReportsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="analytics" color={color} size={size} />
);

const StatsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="stats-chart" color={color} size={size} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1', // Indigo moderne
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          display: 'none', // Cache la tab bar puisqu'on a qu'un seul tab
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Accueil', 
          tabBarIcon: HomeIcon,
          href: '/', // Route par défaut
        }} 
      />
    </Tabs>
  );
}