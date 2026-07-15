import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalorieRing, MacroRow, Pill, StatCol, Wordmark } from '@/components/shared';
import { FoodItem, MealName, totalsOf } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, calorieStatus, font, MEAL_ICON, MEALS, radius } from '@/theme';
import { addDays, dateKey, longDate, num, todayKey } from '@/util';
import { Txt } from '@/ui';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { getDay, goals, setWater, updateItem, removeItem } = useFoodlog();
  const [selected, setSelected] = useState(todayKey());
  const [editing, setEditing] = useState<FoodItem | null>(null);

  const day = getDay(selected);
  const totals = useMemo(() => totalsOf(day.items), [day.items]);
  const status = calorieStatus(totals.calories, goals.calories);
  const isToday = selected === todayKey();

  const go = (n: number) => {
    const next = dateKey(addDays(new Date(selected + 'T00:00:00'), n));
    if (next <= todayKey()) setSelected(next);
  };

  const currentMeal = (): MealName => {
    const h = new Date().getHours();
    if (h < 11) return 'Breakfast';
    if (h < 15) return 'Lunch';
    if (h < 21) return 'Dinner';
    return 'Snacks';
  };

  const openAdd = (meal: MealName) =>
    router.push({ pathname: '/add', params: { date: selected, meal } });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark />
          <Pressable
            onPress={() => openAdd(currentMeal())}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: C.brand,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Ionicons name="add" size={17} color={C.white} />
            <Txt f={font.bodyBold} size={13} color={C.white}>
              Log food
            </Txt>
          </Pressable>
        </View>

        {/* Date nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <Pressable onPress={() => go(-1)} hitSlop={12} style={{ width: 40, height: 34, justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </Pressable>
          <Pressable onPress={() => setSelected(todayKey())} hitSlop={8}>
            <Txt f={font.bold} size={15} color={C.white}>
              {longDate(selected)}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => go(1)}
            hitSlop={12}
            disabled={isToday}
            style={{ width: 40, height: 34, justifyContent: 'center', alignItems: 'flex-end', opacity: isToday ? 0.3 : 1 }}>
            <Ionicons name="chevron-forward" size={22} color={C.white} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Calories */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
              DAILY ENERGY
            </Txt>
            <Pill label={status.label} bg={status.bg} fg={status.fg} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <CalorieRing value={totals.calories} goal={goals.calories} fill={status.fill} />
            <View style={{ flex: 1, gap: 14 }}>
              <StatCol value={num(totals.calories)} label="Eaten (kcal)" />
              <StatCol value={num(goals.calories)} label="Daily goal" />
              <StatCol value={`${Math.round(goals.calories > 0 ? (totals.calories / goals.calories) * 100 : 0)}%`} label="Of goal" />
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line2, paddingTop: 12 }}>
            <Txt f={font.body} size={12} color={C.muted}>
              Sugar <Txt f={font.bodyBold} size={12} color={C.textSub}>{Math.round(totals.sugar)} g</Txt>
            </Txt>
            <Txt f={font.body} size={12} color={C.muted}>
              Sodium <Txt f={font.bodyBold} size={12} color={C.textSub}>{num(totals.sodium)} mg</Txt>
            </Txt>
          </View>
        </View>

        {/* Water */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
              HYDRATION
            </Txt>
            <Txt f={font.bold} size={15} color={C.ink}>
              {Math.round(day.water)} / {goals.water} glasses
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: goals.water }).map((_, i) => {
              const filled = i < day.water;
              return (
                <Pressable
                  key={i}
                  onPress={() => setWater(selected, i + 1 === day.water ? i : i + 1)}
                  style={{
                    width: 26,
                    height: 34,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: filled ? C.ink : C.line,
                    backgroundColor: filled ? C.ink : C.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="water" size={13} color={filled ? C.white : C.line} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Meal timeline */}
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4, marginTop: 4, marginLeft: 2 }}>
          MEAL TIMELINE
        </Txt>
        {MEALS.map((meal) => {
          const items = day.items.filter((i) => i.meal === meal);
          const mt = totalsOf(items);
          return (
            <View key={meal} style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: items.length ? 12 : 4 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name={MEAL_ICON[meal] as any} size={17} color={C.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt f={font.bold} size={15} color={C.ink}>
                    {meal}
                  </Txt>
                  <Txt f={font.body} size={11} color={C.muted}>
                    {items.length} item{items.length === 1 ? '' : 's'} · {num(mt.calories)} kcal
                  </Txt>
                </View>
                <Pressable
                  onPress={() => openAdd(meal)}
                  hitSlop={8}
                  style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color={C.ink} />
                </Pressable>
              </View>

              {items.map((it) => (
                <Pressable
                  key={it.id}
                  onPress={() => setEditing(it)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Txt f={font.bodySemi} size={13.5} color={C.textSub} numberOfLines={1}>
                      {it.name}
                    </Txt>
                    <Txt f={font.body} size={11} color={C.muted}>
                      {it.servings % 1 === 0 ? it.servings : it.servings.toFixed(1)} × {it.serving}
                    </Txt>
                  </View>
                  <Txt f={font.bold} size={13.5} color={C.ink}>
                    {num(it.calories * it.servings)}
                  </Txt>
                  <Ionicons name="chevron-forward" size={15} color={C.muted2} style={{ marginLeft: 4 }} />
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <EditItemModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(s) => {
          if (editing) updateItem(selected, editing.id, { servings: s });
          setEditing(null);
        }}
        onRemove={() => {
          if (editing) removeItem(selected, editing.id);
          setEditing(null);
        }}
      />
    </View>
  );
}

function EditItemModal({
  item,
  onClose,
  onSave,
  onRemove,
}: {
  item: FoodItem | null;
  onClose: () => void;
  onSave: (servings: number) => void;
  onRemove: () => void;
}) {
  const [servings, setServings] = useState(1);
  React.useEffect(() => {
    if (item) setServings(item.servings);
  }, [item]);
  if (!item) return null;
  const step = (d: number) => setServings((s) => Math.max(0.5, Math.round((s + d) * 2) / 2));

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#0A0A0A88', justifyContent: 'center', padding: 24 }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.bg, borderRadius: 20, padding: 20 }}>
          <Txt f={font.black} size={18} color={C.ink}>
            {item.name}
          </Txt>
          <Txt f={font.body} size={12} color={C.muted} style={{ marginTop: 2 }}>
            {item.serving} · {Math.round(item.calories)} kcal / serving
          </Txt>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
            <Txt f={font.bodySemi} size={14} color={C.textSub}>
              Servings
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Pressable onPress={() => step(-0.5)} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="remove" size={18} color={C.ink} />
              </Pressable>
              <Txt f={font.black} size={22} color={C.ink} style={{ minWidth: 44, textAlign: 'center' }}>
                {servings % 1 === 0 ? servings : servings.toFixed(1)}
              </Txt>
              <Pressable onPress={() => step(0.5)} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={18} color={C.ink} />
              </Pressable>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Txt f={font.black} size={26} color={C.ink}>
              {num(item.calories * servings)} <Txt f={font.body} size={13} color={C.muted}>kcal total</Txt>
            </Txt>
          </View>

          <Pressable onPress={() => onSave(servings)} style={({ pressed }) => ({ marginTop: 20, height: 50, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Txt f={font.bold} size={15} color={C.white}>
              Save
            </Txt>
          </Pressable>
          <Pressable onPress={onRemove} style={{ marginTop: 10, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.dangerBg, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
            <Txt f={font.bodyBold} size={14} color={C.danger}>
              Remove from diary
            </Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
