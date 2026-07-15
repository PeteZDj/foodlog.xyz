import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CalorieRing, DetailHeader, MacroRow, Pill, StatCol } from '@/components/shared';
import { totalsOf } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, calorieStatus, font, MEAL_ICON, MEALS, radius } from '@/theme';
import { longDate, num } from '@/util';
import { Txt } from '@/ui';

export default function DayDetailScreen() {
  const insets = useSafeAreaInsets();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { getDay, goals } = useFoodlog();

  const day = getDay(key);
  const totals = useMemo(() => totalsOf(day.items), [day.items]);
  const status = calorieStatus(totals.calories, goals.calories);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <DetailHeader title={longDate(key)} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Calories */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
              DAILY ENERGY
            </Txt>
            <Pill label={status.label === 'In progress' ? 'Under goal' : status.label} bg={status.bg} fg={status.fg} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <CalorieRing value={totals.calories} goal={goals.calories} fill={status.fill} />
            <View style={{ flex: 1, gap: 14 }}>
              <StatCol value={num(totals.calories)} label="Eaten (kcal)" />
              <StatCol value={num(goals.calories)} label="Daily goal" />
              <StatCol value={`${totals.items}`} label="Items logged" />
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18, gap: 14 }}>
          <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
            MACRO BALANCE
          </Txt>
          <MacroRow name="Protein" value={totals.protein} goal={goals.protein} fill={C.protein} />
          <MacroRow name="Carbohydrates" value={totals.carbs} goal={goals.carbs} fill={C.carbs} />
          <MacroRow name="Fat" value={totals.fat} goal={goals.fat} fill={C.fat} />
          <MacroRow name="Fiber" value={totals.fiber} goal={goals.fiber} fill={C.fiber} />
        </View>

        {/* Meals */}
        {MEALS.map((meal) => {
          const items = day.items.filter((i) => i.meal === meal);
          if (!items.length) return null;
          const mt = totalsOf(items);
          return (
            <View key={meal} style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name={MEAL_ICON[meal] as any} size={16} color={C.ink} />
                </View>
                <Txt f={font.bold} size={15} color={C.ink} style={{ flex: 1 }}>
                  {meal}
                </Txt>
                <Txt f={font.bold} size={14} color={C.ink}>
                  {num(mt.calories)} kcal
                </Txt>
              </View>
              {items.map((it) => (
                <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Txt f={font.bodySemi} size={13} color={C.textSub} numberOfLines={1}>
                      {it.name}
                    </Txt>
                    <Txt f={font.body} size={11} color={C.muted}>
                      {it.servings % 1 === 0 ? it.servings : it.servings.toFixed(1)} × {it.serving}
                    </Txt>
                  </View>
                  <Txt f={font.bold} size={13} color={C.ink}>
                    {num(it.calories * it.servings)}
                  </Txt>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
