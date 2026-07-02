import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.bg2, borderTopColor: C.line },
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.dim,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} /> }} />
      <Tabs.Screen name="clips" options={{ title: 'Clips', tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" color={color} size={size} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
