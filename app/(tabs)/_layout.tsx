import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


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
        tabBarHideOnKeyboard: true, 
        tabBarActiveTintColor: '#6366f1', 
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          display: 'none', 
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
          href: '/', 
        }} 
      />
    </Tabs>
  );
}