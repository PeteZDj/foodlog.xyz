import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddFoodSheet } from '@/components/AddFoodSheet';
import { FoodRow } from '@/app/(tabs)/foods';
import { searchLocal } from '@/data/foods';
import { searchOpenFoodFacts } from '@/data/off';
import { Food, MealName } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { todayKey } from '@/util';
import { Txt } from '@/ui';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const date = params.date || todayKey();
  const meal = (params.meal as MealName) || 'Breakfast';

  const { customFoods, recentFoods } = useFoodlog();
  const [q, setQ] = useState('');
  const [off, setOff] = useState<Food[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const local = useMemo(() => searchLocal(q, customFoods).slice(0, 40), [q, customFoods]);

  useEffect(() => {
    abortRef.current?.abort();
    setOff([]);
    const query = q.trim();
    if (query.length < 2) {
      setOffLoading(false);
      return;
    }
    setOffLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(async () => {
      const res = await searchOpenFoodFacts(query, ctrl.signal);
      if (!ctrl.signal.aborted) {
        // Drop products already covered by built-in names.
        const localNames = new Set(local.map((f) => f.name.toLowerCase()));
        setOff(res.filter((f) => !localNames.has(f.name.toLowerCase())));
        setOffLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const showRecents = q.trim().length === 0 && recentFoods.length > 0;

  const sections: { key: string; title: string; data: Food[] }[] = [];
  if (showRecents) sections.push({ key: 'recent', title: 'Recent', data: recentFoods });
  sections.push({ key: 'local', title: q.trim() ? 'Foodlog database' : 'All foods', data: local });
  if (off.length) sections.push({ key: 'off', title: 'Global products', data: off });

  const flat: ({ header: string } | Food)[] = [];
  sections.forEach((s) => {
    if (s.data.length) {
      flat.push({ header: s.title });
      s.data.forEach((f) => flat.push(f));
    }
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header + search */}
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 38, height: 38, justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={C.white} />
          </Pressable>
          <Txt f={font.bold} size={17} color={C.white} style={{ flex: 1 }}>
            Add to {meal}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF18', borderRadius: radius.md, paddingHorizontal: 12, height: 46 }}>
          <Ionicons name="search" size={18} color="#B9B9B4" />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder="Search foods, brands, products…"
            placeholderTextColor="#8A8A85"
            style={{ flex: 1, marginLeft: 8, color: C.white, fontFamily: font.body, fontSize: 15 }}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#B9B9B4" />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={flat}
        keyExtractor={(item, i) => ('header' in item ? `h_${item.header}` : item.id) + i}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <Pressable
            onPress={() => router.push('/custom-food')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, marginBottom: 4, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.brandMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={19} color={C.brandDark} />
            </View>
            <Txt f={font.bodySemi} size={14} color={C.brandDark}>
              Create a custom food
            </Txt>
          </Pressable>
        }
        renderItem={({ item }) =>
          'header' in item ? (
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 12, marginBottom: 8 }}>
              {item.header.toUpperCase()}
            </Txt>
          ) : (
            <FoodRow food={item} onPress={() => setSelected(item)} right={<Ionicons name="add-circle" size={22} color={C.ink} />} />
          )
        }
        ListFooterComponent={
          offLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 }}>
              <ActivityIndicator color={C.muted} />
              <Txt f={font.body} size={12.5} color={C.muted}>
                Searching global database…
              </Txt>
            </View>
          ) : null
        }
      />

      <AddFoodSheet
        food={selected}
        dateKey={date}
        defaultMeal={meal}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onAdded={() => router.back()}
      />
    </View>
  );
}
