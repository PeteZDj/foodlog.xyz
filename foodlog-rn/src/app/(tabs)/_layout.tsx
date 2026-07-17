import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, Tabs } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useFoodlog } from '@/store';
import { C, font } from '@/theme';

export default function TabsLayout() {
  const { ready, user, onboarded } = useFoodlog();
  if (ready && !user) return <Redirect href="/login" />;
  if (ready && user && !onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={{ flex: 1 }}>
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
          options={{ title: 'Trends', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }}
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

      {/* Center action — quick access to the add-food sheet */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'ios' ? 44 : 32, alignItems: 'center' }}>
        <Pressable
          onPress={() => router.push('/add')}
          style={({ pressed }) => ({
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: C.brand,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 4,
            borderColor: C.bg,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}>
          <Ionicons name="add" size={30} color={C.white} />
        </Pressable>
      </View>
    </View>
  );
}
