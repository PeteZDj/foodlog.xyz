// Add-food flow — a Fastic-style sheet in Foodlog colors with four ways in:
//   Search   → the food database (built-in + OpenFoodFacts)
//   Scan     → take / upload a photo → Gemini vision (/api/scan)
//   Describe → free-text "what did you eat?" → Gemini (/api/parse)
//   Manual   → type the macros yourself
// Scanned / described items are logged with their photo (base64) or emoji so
// they sync to the account and show up on the website too.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddFoodSheet } from '@/components/AddFoodSheet';
import { FoodRow } from '@/app/(tabs)/foods';
import { api, ParseItem, ScanItem } from '@/data/api';
import { searchLocal } from '@/data/foods';
import { searchOpenFoodFacts } from '@/data/off';
import { Food, FoodItem, MealName } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, font, MEALS, radius } from '@/theme';
import { num, todayKey, uid } from '@/util';
import { Txt } from '@/ui';

type Tab = 'search' | 'scan' | 'describe' | 'manual';
type Staged = ScanItem & { _qty: number; _on: boolean; emoji?: string };

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'scan', label: 'Scan', icon: 'camera' },
  { key: 'describe', label: 'Describe', icon: 'sparkles' },
  { key: 'manual', label: 'Manual', icon: 'create-outline' },
];

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; meal?: string; tab?: string }>();
  const date = params.date || todayKey();
  const [meal, setMeal] = useState<MealName>((params.meal as MealName) || 'Breakfast');
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'search');
  const { token, addItem } = useFoodlog();

  const logItems = (items: Staged[], photo?: string, source?: string) => {
    items
      .filter((it) => it._on)
      .forEach((it) => {
        const id = uid();
        const entry: FoodItem = {
          id,
          entryId: id,
          name: it.name,
          serving: it.serving,
          meal,
          category: it.category,
          servings: it._qty,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
          fiber: it.fiber,
          photo,
          emoji: it.emoji,
          source,
          loggedAt: new Date().toISOString(),
        };
        addItem(date, entry);
      });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF14', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color={C.white} />
          </Pressable>
          <Txt f={font.bold} size={17} color={C.white} style={{ flex: 1, textAlign: 'center' }}>
            Add food
          </Txt>
          <View style={{ width: 38 }} />
        </View>

        {/* Meal selector */}
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
          {MEALS.map((m) => {
            const active = m === meal;
            return (
              <Pressable
                key={m}
                onPress={() => setMeal(m)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center', backgroundColor: active ? C.white : '#FFFFFF12' }}>
                <Txt f={font.bodySemi} size={12} color={active ? C.ink : '#CFCFCB'}>
                  {m}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line, paddingHorizontal: 8 }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 }}>
              <Ionicons name={t.icon} size={20} color={active ? C.brand : C.muted2} />
              <Txt f={active ? font.bodyBold : font.bodyMed} size={11.5} color={active ? C.brand : C.muted}>
                {t.label}
              </Txt>
              <View style={{ height: 2, width: 26, borderRadius: 1, backgroundColor: active ? C.brand : 'transparent', marginTop: 2 }} />
            </Pressable>
          );
        })}
      </View>

      {tab === 'search' && <SearchTab date={date} meal={meal} />}
      {tab === 'scan' && <ScanTab token={token} onLog={logItems} />}
      {tab === 'describe' && <DescribeTab token={token} onLog={logItems} />}
      {tab === 'manual' && <ManualTab onLog={logItems} />}
    </View>
  );
}

/* ─────────────────────────────── Search ─────────────────────────────── */

function SearchTab({ date, meal }: { date: string; meal: MealName }) {
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
  const flat: ({ header: string } | Food)[] = [];
  if (showRecents) {
    flat.push({ header: 'Recent' });
    recentFoods.forEach((f) => flat.push(f));
  }
  flat.push({ header: q.trim() ? 'Foodlog database' : 'All foods' });
  local.forEach((f) => flat.push(f));
  if (off.length) {
    flat.push({ header: 'Global products' });
    off.forEach((f) => flat.push(f));
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: radius.md, paddingHorizontal: 12, height: 48 }}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search foods, brands, products…"
            placeholderTextColor={C.muted2}
            style={{ flex: 1, marginLeft: 8, color: C.ink, fontFamily: font.body, fontSize: 15 }}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={C.muted2} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={flat}
        keyExtractor={(item, i) => ('header' in item ? `h_${item.header}` : item.id) + i}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <Pressable
            onPress={() => router.push('/custom-food')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
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

      <AddFoodSheet food={selected} dateKey={date} defaultMeal={meal} visible={!!selected} onClose={() => setSelected(null)} onAdded={() => router.back()} />
    </View>
  );
}

/* ──────────────────────────────── Scan ──────────────────────────────── */

async function pickImage(fromCamera: boolean): Promise<string | null> {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', `Please allow ${fromCamera ? 'camera' : 'photo'} access in Settings to add meals from pictures.`);
    return null;
  }
  const res = fromCamera
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return null;
  try {
    const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 1024 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
    return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
  } catch {
    return null;
  }
}

function ScanTab({ token, onLog }: { token: string | null; onLog: (items: Staged[], photo?: string, source?: string) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Staged[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const run = async (fromCamera: boolean) => {
    setError('');
    const data = await pickImage(fromCamera);
    if (!data) return;
    setPhoto(data);
    setItems([]);
    setSummary('');
    if (!token) return setError('Please sign in again to scan meals.');
    setLoading(true);
    try {
      const res = await api.scan(token, data);
      if (!res.items?.length) {
        setError(res.summary || 'No food detected. Try a clearer photo of the whole plate.');
      } else {
        setItems(res.items.map((it) => ({ ...it, _qty: 1, _on: true })));
        setSummary(res.summary || '');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not read that photo. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = items.filter((i) => i._on).length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: C.bgElevated }} contentFit="cover" />
        ) : (
          <View style={{ width: '100%', height: 180, borderRadius: radius.lg, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed', backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="restaurant-outline" size={30} color={C.muted2} />
            <Txt f={font.bodyMed} size={14} color={C.muted}>
              Snap or upload your plate 📸
            </Txt>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <BigButton icon="camera" label="Take photo" onPress={() => run(true)} solid />
          <BigButton icon="image-outline" label="Upload" onPress={() => run(false)} />
        </View>

        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, justifyContent: 'center' }}>
            <ActivityIndicator color={C.brand} />
            <Txt f={font.bodyMed} size={14} color={C.textSub}>
              Analyzing your meal…
            </Txt>
          </View>
        )}

        {!!error && !loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, backgroundColor: C.dangerBg, borderRadius: radius.md, padding: 12 }}>
            <Ionicons name="alert-circle" size={17} color={C.danger} />
            <Txt f={font.bodyMed} size={13} color={C.danger} style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        )}

        {items.length > 0 && (
          <>
            {!!summary && (
              <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 18, marginBottom: 4 }}>
                {summary}
              </Txt>
            )}
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 12, marginBottom: 8 }}>
              DETECTED FOODS — TAP TO ADJUST
            </Txt>
            {items.map((it, i) => (
              <ResultCard key={i} item={it} onChange={(next) => setItems((arr) => arr.map((x, j) => (j === i ? next : x)))} />
            ))}
          </>
        )}
      </ScrollView>

      {selectedCount > 0 && (
        <LogBar
          label={`Add ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
          kcal={items.filter((i) => i._on).reduce((s, it) => s + it.calories * it._qty, 0)}
          onPress={() => onLog(items, photo || undefined, 'AI photo scan')}
        />
      )}
    </View>
  );
}

/* ────────────────────────────── Describe ────────────────────────────── */

function DescribeTab({ token, onLog }: { token: string | null; onLog: (items: Staged[], photo?: string, source?: string) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Staged[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    if (!text.trim()) return;
    if (!token) return setError('Please sign in again to use AI logging.');
    setLoading(true);
    setItems([]);
    setSummary('');
    try {
      const res = await api.parse(token, text.trim());
      if (!res.items?.length) {
        setError(res.summary || 'Could not find foods in that. Try rephrasing.');
      } else {
        setItems(res.items.map((it: ParseItem) => ({ ...it, _qty: 1, _on: true, emoji: it.emoji })));
        setSummary(res.summary || '');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not understand that. Try rephrasing.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = items.filter((i) => i._on).length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Txt f={font.black} size={19} color={C.ink} style={{ letterSpacing: -0.3 }}>
          What did you eat? 😋
        </Txt>
        <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 4, marginBottom: 12 }}>
          Describe your meal in plain words — we'll break down every item and its nutrition.
        </Txt>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="e.g. 2 chapatis, a cup of beans stew, 1 boiled egg and a mug of chai"
          placeholderTextColor={C.muted2}
          style={{ minHeight: 110, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: radius.lg, padding: 14, color: C.ink, fontFamily: font.body, fontSize: 15.5, textAlignVertical: 'top' }}
        />
        <Pressable
          onPress={run}
          disabled={loading || !text.trim()}
          style={({ pressed }) => ({ marginTop: 12, height: 50, borderRadius: radius.md, backgroundColor: text.trim() ? C.brand : C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.9 : 1 })}>
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="sparkles" size={17} color={C.white} />
              <Txt f={font.bold} size={15} color={C.white}>
                Analyze meal
              </Txt>
            </>
          )}
        </Pressable>

        {!!error && !loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: C.dangerBg, borderRadius: radius.md, padding: 12 }}>
            <Ionicons name="alert-circle" size={17} color={C.danger} />
            <Txt f={font.bodyMed} size={13} color={C.danger} style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        )}

        {items.length > 0 && (
          <>
            {!!summary && (
              <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 18, marginBottom: 4 }}>
                {summary}
              </Txt>
            )}
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 12, marginBottom: 8 }}>
              ITEMS — TAP TO ADJUST
            </Txt>
            {items.map((it, i) => (
              <ResultCard key={i} item={it} onChange={(next) => setItems((arr) => arr.map((x, j) => (j === i ? next : x)))} />
            ))}
          </>
        )}
      </ScrollView>

      {selectedCount > 0 && (
        <LogBar
          label={`Add ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
          kcal={items.filter((i) => i._on).reduce((s, it) => s + it.calories * it._qty, 0)}
          onPress={() => onLog(items, undefined, 'Described')}
        />
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────── Manual ─────────────────────────────── */

function ManualTab({ onLog }: { onLog: (items: Staged[], photo?: string, source?: string) => void }) {
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    setError('');
    if (!name.trim()) return setError('Give your food a name.');
    if (!calories && !protein && !carbs && !fat) return setError('Enter at least the calories or a macro.');
    const item: Staged = {
      name: name.trim(),
      serving: portion.trim() ? `${portion.trim()} g` : '1 serving',
      category: 'Meal',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: 0,
      _qty: 1,
      _on: true,
    };
    onLog([item], undefined, 'Manual');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ManualField label="What did you eat?" value={name} onChangeText={setName} placeholder="e.g. Grandma's beef pilau" autoCapitalize="sentences" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ManualField label="Portion size" value={portion} onChangeText={setPortion} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} />
          <ManualField label="Calories" value={calories} onChangeText={setCalories} placeholder="0" keyboardType="number-pad" suffix="kcal" style={{ flex: 1 }} />
        </View>
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 8, marginBottom: 10 }}>
          MACRONUTRIENTS
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ManualField label="Protein" value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} compact />
          <ManualField label="Carbs" value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} compact />
          <ManualField label="Fat" value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} compact />
        </View>

        {!!error && (
          <Txt f={font.bodyMed} size={13} color={C.danger} style={{ marginTop: 14 }}>
            {error}
          </Txt>
        )}
      </ScrollView>

      <LogBar label="Add meal" kcal={Number(calories) || 0} onPress={save} />
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────── shared building blocks ─────────────────── */

function ResultCard({ item, onChange }: { item: Staged; onChange: (next: Staged) => void }) {
  const step = (d: number) => onChange({ ...item, _qty: Math.max(0.5, Math.round((item._qty + d) * 2) / 2) });
  const kcal = Math.round(item.calories * item._qty);
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: item._on ? C.line : C.line2, padding: 14, marginBottom: 10, opacity: item._on ? 1 : 0.55 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Txt f={font.body} size={20}>{item.emoji || '🍽️'}</Txt>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Txt f={font.bodyBold} size={14.5} color={C.ink} numberOfLines={1}>
            {item.name}
          </Txt>
          <Txt f={font.body} size={11.5} color={C.muted} numberOfLines={1}>
            {item.serving}
          </Txt>
        </View>
        <Pressable onPress={() => onChange({ ...item, _on: !item._on })} hitSlop={8}>
          <Ionicons name={item._on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item._on ? C.brand : C.muted2} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => step(-0.5)} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="remove" size={16} color={C.ink} />
          </Pressable>
          <Txt f={font.bold} size={15} color={C.ink} style={{ minWidth: 34, textAlign: 'center' }}>
            {item._qty % 1 === 0 ? item._qty : item._qty.toFixed(1)}×
          </Txt>
          <Pressable onPress={() => step(0.5)} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={16} color={C.ink} />
          </Pressable>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt f={font.monoBold} size={15} color={C.ink}>
            {num(kcal)} kcal
          </Txt>
          <Txt f={font.body} size={11} color={C.muted}>
            P {Math.round(item.protein * item._qty)} · C {Math.round(item.carbs * item._qty)} · F {Math.round(item.fat * item._qty)}
          </Txt>
        </View>
      </View>
    </View>
  );
}

function LogBar({ label, kcal, onPress }: { label: string; kcal: number; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, paddingBottom: insets.bottom + 12, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ height: 54, borderRadius: radius.md, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.9 : 1 })}>
        <Ionicons name="add-circle" size={20} color={C.white} />
        <Txt f={font.bold} size={16} color={C.white}>
          {label}
        </Txt>
        {kcal > 0 && (
          <Txt f={font.body} size={13} color="#B9B9B4">
            · {num(kcal)} kcal
          </Txt>
        )}
      </Pressable>
    </View>
  );
}

function BigButton({ icon, label, onPress, solid }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; solid?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: solid ? C.brand : C.card,
        borderWidth: 1,
        borderColor: solid ? C.brand : C.line,
        opacity: pressed ? 0.88 : 1,
      })}>
      <Ionicons name={icon} size={19} color={solid ? C.white : C.ink} />
      <Txt f={font.bodyBold} size={14} color={solid ? C.white : C.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

function ManualField({
  label,
  suffix,
  compact,
  style,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; suffix?: string; compact?: boolean; style?: any }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.1, marginBottom: 7 }}>
        {label.toUpperCase()}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: radius.md, paddingHorizontal: 12, height: 50 }}>
        <TextInput
          placeholderTextColor={C.muted2}
          style={{ flex: 1, color: C.ink, fontFamily: font.bodyMed, fontSize: compact ? 15 : 16 }}
          {...props}
        />
        {suffix && (
          <Txt f={font.bodyMed} size={12.5} color={C.muted}>
            {suffix}
          </Txt>
        )}
      </View>
    </View>
  );
}
