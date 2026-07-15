import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/shared';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

const FEATURES = [
  ['restaurant-outline', 'Log every meal', 'Breakfast to midnight snack, in one place'],
  ['stats-chart-outline', 'Track macros & nutrients', 'Protein, carbs, fat, fiber and more'],
  ['lock-closed-outline', 'Private by default', 'Your log lives on this device'],
] as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useFoodlog();

  const enter = () => {
    login();
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Mark size={26} />
          <Txt f={font.black} size={26} color={C.white} style={{ letterSpacing: -0.6 }}>
            foodlog
          </Txt>
        </View>

        <Txt f={font.black} size={34} color={C.white} style={{ marginTop: 40, letterSpacing: -1, lineHeight: 40 }}>
          Nutrition,{'\n'}made legible.
        </Txt>
        <Txt f={font.body} size={15} color="#B9B9B4" lh={22} style={{ marginTop: 14, maxWidth: 320 }}>
          A precise food journal for people who want the full picture — from today to the entire year.
        </Txt>

        <View style={{ marginTop: 40, gap: 20 }}>
          {FEATURES.map(([icon, title, sub]) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF12', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon as any} size={20} color={C.brandLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt f={font.bodyBold} size={15} color={C.white}>
                  {title}
                </Txt>
                <Txt f={font.body} size={12.5} color="#9A9A94">
                  {sub}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Pressable
          onPress={enter}
          style={({ pressed }) => ({ height: 54, borderRadius: radius.md, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed ? 0.9 : 1 })}>
          <Ionicons name="logo-google" size={19} color={C.ink} />
          <Txt f={font.bold} size={16} color={C.ink}>
            Continue with Google
          </Txt>
        </Pressable>
        <Pressable
          onPress={enter}
          style={({ pressed }) => ({ height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Txt f={font.bodySemi} size={15} color={C.white}>
            Start logging offline
          </Txt>
        </Pressable>
        <Txt f={font.body} size={11.5} color="#8A8A85" align="center" style={{ marginTop: 4 }}>
          No account needed — your data stays on your phone.
        </Txt>
      </View>
    </View>
  );
}
