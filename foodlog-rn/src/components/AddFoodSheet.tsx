// Bottom sheet for logging a food: choose meal, dial in servings, see the exact
// nutrition that will be added, then commit to the diary. Shared by the search
// flow (/add) and the food detail page (/food/[id]).

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { C, font, MEALS, radius } from '@/theme';
import { Food, MealName } from '@/data/types';
import { useFoodlog } from '@/store';
import { longDate } from '@/util';
import { Txt } from '@/ui';

const MACROS: { key: keyof Food; label: string; color: string; unit: string }[] = [
  { key: 'protein', label: 'Protein', color: C.protein, unit: 'g' },
  { key: 'carbs', label: 'Carbs', color: C.carbs, unit: 'g' },
  { key: 'fat', label: 'Fat', color: C.fat, unit: 'g' },
  { key: 'fiber', label: 'Fiber', color: C.fiber, unit: 'g' },
];

export function AddFoodSheet({
  food,
  dateKey,
  defaultMeal = 'Breakfast',
  visible,
  onClose,
  onAdded,
}: {
  food: Food | null;
  dateKey: string;
  defaultMeal?: MealName;
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { logFood } = useFoodlog();
  const [meal, setMeal] = useState<MealName>(defaultMeal);
  const [servings, setServings] = useState(1);

  React.useEffect(() => {
    if (visible) {
      setMeal(defaultMeal);
      setServings(1);
    }
  }, [visible, defaultMeal, food?.id]);

  if (!food) return null;
  const kcal = Math.round(food.calories * servings);

  const step = (d: number) => setServings((s) => Math.max(0.5, Math.round((s + d) * 2) / 2));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#0A0A0A88', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: 34,
          }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.line }} />
          </View>

          <Txt f={font.black} size={20} color={C.ink} style={{ letterSpacing: -0.4 }}>
            {food.name}
          </Txt>
          <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 2 }}>
            {food.brand ? `${food.brand} · ` : ''}
            {food.serving} · {Math.round(food.calories)} kcal
          </Txt>

          {/* Meal selector */}
          <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 18, marginBottom: 8 }}>
            ADD TO {longDate(dateKey).toUpperCase()}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MEALS.map((m) => {
              const active = m === meal;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMeal(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: active ? C.ink : C.card,
                    borderWidth: 1,
                    borderColor: active ? C.ink : C.line,
                  }}>
                  <Txt f={font.bodySemi} size={12} color={active ? C.white : C.textSub}>
                    {m}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          {/* Servings stepper */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
            <Txt f={font.bodySemi} size={14} color={C.textSub}>
              Servings
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <StepBtn icon="remove" onPress={() => step(-0.5)} />
              <Txt f={font.black} size={22} color={C.ink} style={{ minWidth: 44, textAlign: 'center' }}>
                {servings % 1 === 0 ? servings : servings.toFixed(1)}
              </Txt>
              <StepBtn icon="add" onPress={() => step(0.5)} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[0.5, 1, 1.5, 2, 3].map((q) => (
              <Pressable
                key={q}
                onPress={() => setServings(q)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  backgroundColor: servings === q ? C.brandMuted : C.card,
                  borderWidth: 1,
                  borderColor: servings === q ? C.brand : C.line,
                }}>
                <Txt f={font.bodySemi} size={12} color={servings === q ? C.brandDark : C.muted}>
                  {q}
                </Txt>
              </Pressable>
            ))}
          </View>

          {/* Live nutrition */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
              <Txt f={font.bodySemi} size={13} color={C.muted}>
                This adds
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Txt f={font.black} size={26} color={C.ink}>
                  {kcal.toLocaleString('en-US')}
                </Txt>
                <Txt f={font.body} size={12} color={C.muted} style={{ marginBottom: 4 }}>
                  kcal
                </Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {MACROS.map((m) => (
                <View key={m.key} style={{ alignItems: 'center', flex: 1 }}>
                  <Txt f={font.bold} size={15} color={C.ink}>
                    {Math.round((food[m.key] as number) * servings)}
                  </Txt>
                  <Txt f={font.body} size={10} color={C.muted}>
                    {m.label}
                  </Txt>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => {
              logFood(dateKey, food, meal, servings);
              onClose();
              onAdded?.();
            }}
            style={({ pressed }) => ({
              marginTop: 18,
              height: 54,
              borderRadius: radius.md,
              backgroundColor: C.ink,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Ionicons name="add-circle" size={20} color={C.white} />
            <Txt f={font.bold} size={16} color={C.white}>
              Add to {meal}
            </Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StepBtn({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: C.ink,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Ionicons name={icon} size={20} color={C.ink} />
    </Pressable>
  );
}
