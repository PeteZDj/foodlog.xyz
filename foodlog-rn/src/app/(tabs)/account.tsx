import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { totalsOf } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { initials, num, round1 } from '@/util';
import { Txt } from '@/ui';

const APK_URL = 'https://foodlog.xyz/downloads/foodlog-android.apk';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, goals, profile, loggedDayKeys, getDay, customFoods, syncing } = useFoodlog();
  const avatar = profile.photo || user?.avatar;

  const keys = loggedDayKeys();
  const avg = keys.length
    ? Math.round(keys.reduce((s, k) => s + totalsOf(getDay(k).items).calories, 0) / keys.length)
    : 0;
  const unit = profile.weightUnit || 'kg';

  const body: [string, string][] = [];
  if (profile.currentWeight) body.push(['Current weight', `${round1(profile.currentWeight)} ${unit}`]);
  if (profile.goalWeight) body.push(['Goal weight', `${round1(profile.goalWeight)} ${unit}`]);
  if (profile.height) body.push(['Height', `${round1(profile.height)} cm`]);
  if (profile.primaryGoal) body.push(['Primary goal', profile.primaryGoal]);
  if (profile.activityLevel) body.push(['Activity level', profile.activityLevel]);
  if (profile.foodPhilosophy) body.push(['Food philosophy', profile.foodPhilosophy]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 20, paddingBottom: 26, paddingHorizontal: 20, alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF16', alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 76, height: 76 }} contentFit="cover" />
            ) : (
              <Txt f={font.black} size={28} color={C.white}>
                {initials(user?.name)}
              </Txt>
            )}
          </View>
          <Txt f={font.black} size={20} color={C.white}>
            {user?.name || 'My foodlog'}
          </Txt>
          <Txt f={font.body} size={13} color="#B9B9B4" style={{ marginTop: 2 }}>
            {user?.email || ''}
          </Txt>

          <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
            <HeaderStat value={String(keys.length)} label="Days logged" />
            <HeaderStat value={num(avg)} label="Avg kcal" />
            <HeaderStat value={String(customFoods.length)} label="Custom foods" />
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* Goals */}
          <SectionCard
            title="Daily nutrition goals"
            action="Edit"
            onAction={() => router.push('/goals')}
            rows={[
              ['Calories', `${num(goals.calories)} kcal`],
              ['Protein', `${Math.round(goals.protein)} g`],
              ['Carbohydrates', `${Math.round(goals.carbs)} g`],
              ['Fat', `${Math.round(goals.fat)} g`],
              ['Fiber', `${Math.round(goals.fiber)} g`],
              ['Water', `${Math.round(goals.water)} glasses`],
            ]}
          />

          {body.length > 0 && <SectionCard title="Body & goals" action="Log weight" onAction={() => router.push('/weight')} rows={body} />}

          {/* Links */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            <LinkRow icon="barbell-outline" label="Weight & progress" onPress={() => router.push('/weight')} />
            <LinkRow icon="options-outline" label="Adjust goals" onPress={() => router.push('/goals')} />
            <LinkRow icon="add-circle-outline" label="Create custom food" onPress={() => router.push('/custom-food')} />
            <LinkRow icon="download-outline" label="Get the Android app" onPress={() => Linking.openURL(APK_URL)} last />
          </View>

          <SectionCard title="Account" rows={[['Signed in as', user?.email || '—'], ['Sync', syncing ? 'Saving…' : 'Synced to your account']]} />

          <Pressable
            onPress={() =>
              Alert.alert('Sign out', 'Sign out of Foodlog on this device?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
              ])
            }
            style={{ height: 52, borderRadius: radius.md, backgroundColor: C.card, borderWidth: 1, borderColor: '#E6C9C9', alignItems: 'center', justifyContent: 'center' }}>
            <Txt f={font.bodyBold} size={14} color={C.danger} style={{ letterSpacing: 0.4 }}>
              SIGN OUT
            </Txt>
          </Pressable>

          <Txt f={font.mono} size={11} color={C.muted2} align="center" style={{ marginTop: 4 }}>
            Foodlog v1.2 · Daily nutrition, clearly.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF12', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', minWidth: 92 }}>
      <Txt f={font.black} size={18} color={C.white}>
        {value}
      </Txt>
      <Txt f={font.body} size={10.5} color="#B9B9B4" style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

function SectionCard({ title, rows, action, onAction }: { title: string; rows: [string, string][]; action?: string; onAction?: () => void }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2 }}>
          {title.toUpperCase()}
        </Txt>
        {action && (
          <Pressable onPress={onAction} hitSlop={8}>
            <Txt f={font.bodySemi} size={12.5} color={C.brand}>
              {action}
            </Txt>
          </Pressable>
        )}
      </View>
      {rows.map(([k, v], i) => (
        <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line2 }}>
          <Txt f={font.body} size={13.5} color={C.muted} style={{ flex: 1, paddingRight: 12 }}>
            {k}
          </Txt>
          <Txt f={font.bodyBold} size={13.5} color={C.ink} style={{ flexShrink: 1, textAlign: 'right' }}>
            {v}
          </Txt>
        </View>
      ))}
    </View>
  );
}

function LinkRow({ icon, label, onPress, last }: { icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line2, backgroundColor: pressed ? C.bgElevated : C.card })}>
      <Ionicons name={icon} size={19} color={C.ink} />
      <Txt f={font.bodySemi} size={14} color={C.ink} style={{ flex: 1, marginLeft: 12 }}>
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={16} color={C.muted2} />
    </Pressable>
  );
}
