import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/shared';
import { FOOD_CATEGORIES, FOODS, searchLocal } from '@/data/foods';
import { Food } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

export default function FoodsScreen() {
  const insets = useSafeAreaInsets();
  const { customFoods } = useFoodlog();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  const results = useMemo(() => {
    let list = searchLocal(q, customFoods);
    if (cat) list = list.filter((f) => f.category === cat);
    return list;
  }, [q, cat, customFoods]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="Foods" subtitle={`${FOODS.length + customFoods.length} foods · tap for nutrition`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF18', borderRadius: radius.md, paddingHorizontal: 12, marginTop: 14, height: 44 }}>
            <Ionicons name="search" size={18} color="#B9B9B4" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search foods & products"
              placeholderTextColor="#8A8A85"
              style={{ flex: 1, marginLeft: 8, color: C.white, fontFamily: font.body, fontSize: 15 }}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#B9B9B4" />
              </Pressable>
            )}
          </View>
        </Header>
      </View>

      <FlatList
        data={results}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <CatChip label="All" active={!cat} onPress={() => setCat(null)} />
              {FOOD_CATEGORIES.map((c) => (
                <CatChip key={c} label={c} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />
              ))}
            </View>
            <Pressable
              onPress={() => router.push('/custom-food')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: C.brandMuted,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: C.brand,
                padding: 14,
                marginTop: 4,
                opacity: pressed ? 0.9 : 1,
              })}>
              <Ionicons name="add-circle" size={20} color={C.brandDark} />
              <View style={{ flex: 1 }}>
                <Txt f={font.bodyBold} size={14} color={C.brandDark}>
                  Create a custom food
                </Txt>
                <Txt f={font.body} size={11.5} color={C.brandDark}>
                  Add your own item with exact nutrition
                </Txt>
              </View>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <FoodRow food={item} onPress={() => router.push({ pathname: '/food/[id]', params: { id: item.id } })} />}
        ListEmptyComponent={
          <Txt f={font.body} size={13} color={C.muted} align="center" style={{ marginTop: 30 }}>
            No foods match "{q}".
          </Txt>
        }
      />
    </View>
  );
}

export function FoodRow({ food, onPress, right }: { food: Food; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: C.line,
        padding: 13,
        marginBottom: 8,
        opacity: pressed ? 0.9 : 1,
      })}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Txt f={font.bodySemi} size={14} color={C.ink} numberOfLines={1}>
          {food.name}
        </Txt>
        <Txt f={font.body} size={11.5} color={C.muted} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {food.serving}
          {food.source === 'custom' ? ' · Custom' : food.source === 'off' ? ' · Product' : ''}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: right ? 10 : 0 }}>
        <Txt f={font.bold} size={14} color={C.ink}>
          {Math.round(food.calories)}
        </Txt>
        <Txt f={font.mono} size={9} color={C.muted}>
          KCAL
        </Txt>
      </View>
      {right ?? <Ionicons name="chevron-forward" size={16} color={C.muted2} />}
    </Pressable>
  );
}

function CatChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: radius.pill,
        backgroundColor: active ? C.ink : C.card,
        borderWidth: 1,
        borderColor: active ? C.ink : C.line,
        marginRight: 8,
        marginBottom: 8,
      }}>
      <Txt f={font.bodySemi} size={12.5} color={active ? C.white : C.textSub}>
        {label}
      </Txt>
    </Pressable>
  );
}
