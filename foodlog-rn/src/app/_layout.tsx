import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { DMMono_400Regular, DMMono_500Medium, useFonts } from '@expo-google-fonts/dm-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FoodlogProvider } from '@/store';
import { UpdateGate } from '@/components/UpdateGate';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FoodlogProvider>
          <StatusBar style="light" />
          <UpdateGate />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="food/[id]" />
            <Stack.Screen name="custom-food" options={{ presentation: 'modal' }} />
            <Stack.Screen name="goals" />
            <Stack.Screen name="weight" />
            <Stack.Screen name="day/[key]" />
            <Stack.Screen name="login" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </FoodlogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
