import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AddFoodSheet } from '@/components/AddFoodSheet';
import { DetailHeader } from '@/components/shared';
import { FOODS } from '@/data/foods';
import { Food } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { num, todayKey } from '@/util';
import { Txt } from '@/ui';

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customFoods } = useFoodlog();
  const [adding, setAdding] = useState(false);

  const food: Food | undefined = [...customFoods, ...FOODS].find((f) => f.id === id);

  if (!food) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ paddingTop: insets.top }}>
          <DetailHeader title="Food" />
        </View>
        <Txt f={font.body} size={14} color={C.muted} align="center" style={{ marginTop: 40 }}>
          Food not found.
        </Txt>
      </View>
    );
  }

  const pCal = food.protein * 4;
  const cCal = food.carbs * 4;
  const fCal = food.fat * 9;
  const macroCal = pCal + cCal + fCal || 1;
  const pct = (x: number) => Math.round((x / macroCal) * 100);

  const nutrients: [string, string, boolean?][] = [
    ['Calories', `${Math.round(food.calories)} kcal`, true],
    ['Protein', `${food.protein} g`],
    ['Total carbohydrate', `${food.carbs} g`],
    ...(food.sugar != null ? ([['   of which sugars', `${food.sugar} g`]] as [string, string][]) : []),
    ['Total fat', `${food.fat} g`],
    ...(food.satFat != null ? ([['   of which saturated', `${food.satFat} g`]] as [string, string][]) : []),
    ['Fiber', `${food.fiber} g`],
    ...(food.sodium != null ? ([['Sodium', `${num(food.sodium)} mg`]] as [string, string][]) : []),
    ...(food.potassium != null ? ([['Potassium', `${num(food.potassium)} mg`]] as [string, string][]) : []),
    ...(food.calcium != null ? ([['Calcium', `${num(food.calcium)} mg`]] as [string, string][]) : []),
    ...(food.iron != null ? ([['Iron', `${food.iron} mg`]] as [string, string][]) : []),
    ...(food.vitaminC != null ? ([['Vitamin C', `${food.vitaminC} mg`]] as [string, string][]) : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <DetailHeader title={food.name} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 20, alignItems: 'center' }}>
          {(food.brand || food.category) && (
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1, marginBottom: 8 }}>
              {(food.brand || food.category).toUpperCase()}
            </Txt>
          )}
          <Txt f={font.black} size={40} color={C.ink} style={{ letterSpacing: -1.5 }}>
            {Math.round(food.calories)}
          </Txt>
          <Txt f={font.body} size={13} color={C.muted}>
            kcal per {food.serving}
          </Txt>

          {/* Macro split bar */}
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', width: '100%', marginTop: 18 }}>
            <View style={{ flex: pCal || 0.001, backgroundColor: C.protein }} />
            <View style={{ flex: cCal || 0.001, backgroundColor: C.fat }} />
            <View style={{ flex: fCal || 0.001, backgroundColor: C.fiber }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12 }}>
            <MacroLegend color={C.protein} label="Protein" grams={food.protein} pct={pct(pCal)} />
            <MacroLegend color={C.fat} label="Carbs" grams={food.carbs} pct={pct(cCal)} />
            <MacroLegend color={C.fiber} label="Fat" grams={food.fat} pct={pct(fCal)} />
          </View>
        </View>

        {/* Nutrition facts */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
          <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginBottom: 10 }}>
            NUTRITION FACTS · PER {food.serving.toUpperCase()}
          </Txt>
          {nutrients.map(([k, v, bold], i) => (
            <View key={k + i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line2 }}>
              <Txt f={bold ? font.bodyBold : font.body} size={bold ? 14 : 13.5} color={k.startsWith('   ') ? C.muted : C.textSub}>
                {k.trim()}
              </Txt>
              <Txt f={bold ? font.black : font.bodyBold} size={bold ? 14 : 13.5} color={C.ink}>
                {v}
              </Txt>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add button */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line }}>
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => ({ height: 54, borderRadius: radius.md, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 })}>
          <Ionicons name="add-circle" size={20} color={C.white} />
          <Txt f={font.bold} size={16} color={C.white}>
            Add to diary
          </Txt>
        </Pressable>
      </View>

      <AddFoodSheet food={food} dateKey={todayKey()} visible={adding} onClose={() => setAdding(false)} onAdded={() => router.replace('/')} />
    </View>
  );
}

function MacroLegend({ color, label, grams, pct }: { color: string; label: string; grams: number; pct: number }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
        <Txt f={font.bodySemi} size={12} color={C.textSub}>
          {label}
        </Txt>
      </View>
      <Txt f={font.bold} size={15} color={C.ink} style={{ marginTop: 3 }}>
        {grams} g
      </Txt>
      <Txt f={font.mono} size={10} color={C.muted}>
        {pct}%
      </Txt>
    </View>
  );
}
