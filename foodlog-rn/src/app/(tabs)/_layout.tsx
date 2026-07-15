import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useFoodlog } from '@/store';
import { C, font } from '@/theme';

export default function TabsLayout() {
  const { ready, user } = useFoodlog();
  if (ready && !user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.muted2,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: font.bodySemi, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="foods"
        options={{ title: 'Foods', tabBarIcon: ({ color, size }) => <Ionicons name="fast-food-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
