import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailHeader } from '@/components/shared';
import { Goals } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { num } from '@/util';
import { Txt } from '@/ui';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { goals, setGoals } = useFoodlog();
  const [g, setG] = useState<Goals>(goals);

  const set = (k: keyof Goals, v: number) => setG((prev) => ({ ...prev, [k]: Math.max(0, v) }));
  const fromMacros = g.protein * 4 + g.carbs * 4 + g.fat * 9;

  const save = () => {
    setGoals(g);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <DetailHeader title="Daily goals" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        <GoalRow label="Calories" unit="kcal" value={g.calories} step={50} onChange={(v) => set('calories', v)} />

        <View style={{ backgroundColor: fromMacros > g.calories * 1.05 || fromMacros < g.calories * 0.95 ? C.warnBg : C.brandMuted, borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="calculator-outline" size={16} color={C.textSub} />
          <Txt f={font.body} size={12.5} color={C.textSub} style={{ flex: 1 }}>
            Your macros add up to {num(fromMacros)} kcal
            {Math.abs(fromMacros - g.calories) > g.calories * 0.05 ? ` — ${fromMacros > g.calories ? 'above' : 'below'} your calorie goal.` : ' — nicely balanced.'}
          </Txt>
        </View>

        <GoalRow label="Protein" unit="g" value={g.protein} step={5} onChange={(v) => set('protein', v)} fill={C.protein} />
        <GoalRow label="Carbohydrates" unit="g" value={g.carbs} step={5} onChange={(v) => set('carbs', v)} fill={C.carbs} />
        <GoalRow label="Fat" unit="g" value={g.fat} step={5} onChange={(v) => set('fat', v)} fill={C.fat} />
        <GoalRow label="Fiber" unit="g" value={g.fiber} step={1} onChange={(v) => set('fiber', v)} fill={C.fiber} />
        <GoalRow label="Water" unit="glasses" value={g.water} step={1} onChange={(v) => set('water', v)} fill={C.water} />

        <Pressable onPress={save} style={({ pressed }) => ({ marginTop: 8, height: 54, borderRadius: radius.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
          <Txt f={font.bold} size={16} color={C.white}>
            Save goals
          </Txt>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function GoalRow({ label, unit, value, step, onChange, fill }: { label: string; unit: string; value: number; step: number; onChange: (v: number) => void; fill?: string }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
      {fill && <View style={{ width: 4, height: 34, borderRadius: 2, backgroundColor: fill, marginRight: 12 }} />}
      <View style={{ flex: 1 }}>
        <Txt f={font.bodySemi} size={14} color={C.ink}>
          {label}
        </Txt>
        <Txt f={font.body} size={11.5} color={C.muted}>
          {unit}
        </Txt>
      </View>
      <Pressable onPress={() => onChange(value - step)} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="remove" size={18} color={C.ink} />
      </Pressable>
      <Txt f={font.black} size={19} color={C.ink} style={{ minWidth: 66, textAlign: 'center' }}>
        {num(value)}
      </Txt>
      <Pressable onPress={() => onChange(value + step)} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="add" size={18} color={C.ink} />
      </Pressable>
    </View>
  );
}
