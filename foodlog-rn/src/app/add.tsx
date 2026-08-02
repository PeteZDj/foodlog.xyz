// Add-food flow — a Fastic-style sheet in Foodlog colors with four ways in:
//   Search   → the food database (built-in + OpenFoodFacts)
//   Scan     → take / upload a photo → Gemini vision (/api/scan) → nutrition label
//   Voice    → speak your meal (keyboard dictation) → Gemini (/api/parse)
//   Manual   → snap/upload + auto-fill the facts, or type the macros yourself
// Scanned / described items are logged with their photo (base64) or emoji so
// they sync to the account and show up on the website too.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddFoodSheet } from '@/components/AddFoodSheet';
import { FoodRow } from '@/app/(tabs)/foods';
import { api, ParseItem, ScanItem } from '@/data/api';
import { searchLocal } from '@/data/foods';
import { searchOpenFoodFacts } from '@/data/off';
import { Food, FoodItem, MealName } from '@/data/types';
import { mealForCurrentTime } from '@/data/merge';
import { useFoodlog } from '@/store';
import { C, font, MEAL_ICON, MEALS, radius } from '@/theme';
import { num, todayKey, uid } from '@/util';
import { Txt } from '@/ui';

type Tab = 'type' | 'search' | 'scan' | 'voice';
type Staged = ScanItem & { _qty: number; _on: boolean; emoji?: string };

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'type', label: 'Type', icon: 'create-outline', color: '#E7A33E' },
  { key: 'search', label: 'Search', icon: 'search', color: C.ink },
  { key: 'scan', label: 'Scan', icon: 'camera', color: C.brand },
  { key: 'voice', label: 'Voice', icon: 'mic', color: C.water },
];

/* A 0–100 health score from the macros of a food (higher = better). */
function nutritionScore(m: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; satFat?: number }): number {
  let s = 55;
  s += Math.min(24, (m.protein || 0) * 0.6); // protein is good
  s += Math.min(14, (m.fiber || 0) * 2); // fiber is good
  s -= Math.min(22, (m.satFat || 0) * 1.6); // saturated fat is bad
  s -= Math.min(22, (m.sugar || 0) * 0.5); // sugar is bad
  if ((m.calories || 0) > 600) s -= Math.min(18, (m.calories - 600) * 0.02); // very calorie-dense
  return Math.max(5, Math.min(98, Math.round(s)));
}
function scoreLabel(s: number): string {
  if (s >= 80) return 'Excellent';
  if (s >= 65) return 'Good';
  if (s >= 45) return 'Fair';
  if (s >= 25) return 'Heavy';
  return 'Treat';
}

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; meal?: string; tab?: string }>();
  const date = params.date || todayKey();
  const [meal, setMeal] = useState<MealName>((params.meal as MealName) || mealForCurrentTime());
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'type');
  const [mealOpen, setMealOpen] = useState(false);
  const { token, addItem, getDay } = useFoodlog();

  const dayCount = getDay(date).items.filter((it) => it.meal === meal).length;

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
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF14', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color={C.white} />
          </Pressable>

          <Pressable
            onPress={() => setMealOpen(true)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Txt f={font.bold} size={17} color={C.white}>
              {meal}
            </Txt>
            <Ionicons name="chevron-down" size={16} color="#CFCFCB" />
          </Pressable>

          <View style={{ minWidth: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
            <Txt f={font.monoBold} size={14} color={C.white}>
              {dayCount}
            </Txt>
          </View>
        </View>
      </View>

      {/* Colored tab chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6, backgroundColor: C.bg }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 11,
                borderRadius: radius.lg,
                backgroundColor: active ? t.color : t.color + '18',
                borderWidth: active ? 0 : 1,
                borderColor: t.color + '2A',
              }}>
              <Ionicons name={t.icon} size={19} color={active ? C.white : t.color} />
              <Txt f={active ? font.bodyBold : font.bodySemi} size={11.5} color={active ? C.white : t.color}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {tab === 'type' && <TypeTab token={token} onLog={logItems} onJump={(t) => setTab(t)} />}
      {tab === 'search' && <SearchTab date={date} meal={meal} />}
      {tab === 'scan' && <ScanTab token={token} onLog={logItems} />}
      {tab === 'voice' && <VoiceTab token={token} onLog={logItems} />}

      {/* Meal dropdown */}
      <Modal visible={mealOpen} transparent animationType="fade" onRequestClose={() => setMealOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#00000055' }} onPress={() => setMealOpen(false)}>
          <View style={{ position: 'absolute', top: insets.top + 54, alignSelf: 'center', width: 240, backgroundColor: C.card, borderRadius: radius.lg, paddingVertical: 6, borderWidth: 1, borderColor: C.line }}>
            {MEALS.map((m) => {
              const active = m === meal;
              return (
                <Pressable
                  key={m}
                  onPress={() => { setMeal(m); setMealOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
                  <Ionicons name={(MEAL_ICON[m] as any) || 'restaurant-outline'} size={18} color={active ? C.brand : C.muted} />
                  <Txt f={active ? font.bodyBold : font.bodyMed} size={15} color={active ? C.ink : C.textSub} style={{ flex: 1 }}>
                    {m}
                  </Txt>
                  {active && <Ionicons name="checkmark" size={18} color={C.brand} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─────────────────────────────── Type (default) ─────────────────────── */

function TypeTab({
  token,
  onLog,
  onJump,
}: {
  token: string | null;
  onLog: (items: Staged[], photo?: string, source?: string) => void;
  onJump: (tab: Tab) => void;
}) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Staged[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const runDescribe = async () => {
    setError('');
    if (!text.trim()) return setError('Type what you ate — e.g. ugali, sukuma and nyama choma.');
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

  const saveManual = () => {
    setError('');
    if (!name.trim() && !text.trim()) return setError('Give your food a name, or describe the meal above.');
    if (!calories && !protein && !carbs && !fat) {
      // If they typed a description but didn't analyze, nudge them.
      if (text.trim() && !name.trim()) return runDescribe();
      return setError('Enter at least the calories or a macro, or tap Analyze meal.');
    }
    const item: Staged = {
      name: (name.trim() || text.trim()).slice(0, 80),
      serving: '1 serving',
      category: 'Meal',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      _qty: 1,
      _on: true,
    };
    onLog([item], undefined, 'Manual');
  };

  const selectedCount = items.filter((i) => i._on).length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Txt f={font.black} size={20} color={C.ink} style={{ letterSpacing: -0.3 }}>
          What did you eat?
        </Txt>
        <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 4, marginBottom: 10 }}>
          Type freely — we&apos;ll break it into foods and macros. Or jump to Scan / Search anytime.
        </Txt>

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          multiline
          placeholder="e.g. 2 chapati, beans stew, boiled egg and a mug of chai"
          placeholderTextColor={C.muted2}
          style={{ minHeight: 110, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: radius.lg, padding: 14, color: C.ink, fontFamily: font.body, fontSize: 16, textAlignVertical: 'top' }}
        />

        <Pressable
          onPress={runDescribe}
          disabled={loading || !text.trim()}
          style={({ pressed }) => ({
            marginTop: 12,
            height: 52,
            borderRadius: radius.md,
            backgroundColor: text.trim() ? C.brand : C.line,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.9 : 1,
          })}>
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

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <QuickJump icon="camera" label="Scan photo" color={C.brand} onPress={() => onJump('scan')} />
          <QuickJump icon="mic" label="Voice" color={C.water} onPress={() => onJump('voice')} />
          <QuickJump icon="search" label="Search foods" color={C.ink} onPress={() => onJump('search')} />
        </View>

        {!!error && !loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: C.dangerBg, borderRadius: radius.md, padding: 12 }}>
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          <Txt f={font.body} size={12} color={C.muted}>
            or enter macros yourself
          </Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        </View>

        <ManualField label="Food name" value={name} onChangeText={setName} placeholder="e.g. Grandma's beef pilau" autoCapitalize="sentences" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ManualField label="Calories" value={calories} onChangeText={setCalories} placeholder="0" keyboardType="number-pad" suffix="kcal" style={{ flex: 1 }} />
          <ManualField label="Protein" value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ManualField label="Carbs" value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} compact />
          <ManualField label="Fat" value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} compact />
          <ManualField label="Fiber" value={fiber} onChangeText={setFiber} placeholder="0" keyboardType="decimal-pad" suffix="g" style={{ flex: 1 }} compact />
        </View>
      </ScrollView>

      {selectedCount > 0 ? (
        <LogBar
          label={`Add ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
          kcal={items.filter((i) => i._on).reduce((s, it) => s + it.calories * it._qty, 0)}
          onPress={() => onLog(items, undefined, 'Describe')}
        />
      ) : (
        <LogBar label="Add meal" kcal={Number(calories) || 0} onPress={saveManual} />
      )}
    </KeyboardAvoidingView>
  );
}

function QuickJump({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: color + '14',
        borderWidth: 1,
        borderColor: color + '28',
        opacity: pressed ? 0.85 : 1,
      })}>
      <Ionicons name={icon} size={18} color={color} />
      <Txt f={font.bodySemi} size={11} color={color}>
        {label}
      </Txt>
    </Pressable>
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

  const on = items.filter((i) => i._on);
  const selectedCount = on.length;
  const totals = on.reduce(
    (t, it) => ({
      calories: t.calories + it.calories * it._qty,
      protein: t.protein + it.protein * it._qty,
      carbs: t.carbs + it.carbs * it._qty,
      fat: t.fat + it.fat * it._qty,
      fiber: t.fiber + (it.fiber || 0) * it._qty,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

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
            {/* Nutrition facts label for the detected plate */}
            <NutritionLabel
              title={summary || 'Scanned meal'}
              calories={totals.calories}
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
              fiber={totals.fiber}
            />
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 16, marginBottom: 8 }}>
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
          kcal={totals.calories}
          onPress={() => onLog(items, photo || undefined, 'AI photo scan')}
        />
      )}
    </View>
  );
}

/* ─────────────────────────────── Voice ──────────────────────────────── */

function VoiceTab({ token, onLog }: { token: string | null; onLog: (items: Staged[], photo?: string, source?: string) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Staged[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

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
        <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={({ pressed }) => ({ width: 92, height: 92, borderRadius: 46, backgroundColor: C.water, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1, shadowColor: C.water, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 })}>
            <Ionicons name="mic" size={40} color={C.white} />
          </Pressable>
          <Txt f={font.black} size={19} color={C.ink} style={{ marginTop: 16, letterSpacing: -0.3 }}>
            What did you eat? 😋
          </Txt>
          <Txt f={font.body} size={13} color={C.muted} style={{ marginTop: 4, textAlign: 'center', maxWidth: 300 }}>
            Tap the mic, then tap the microphone on your keyboard to speak — or just type it. We'll break down every item and its nutrition.
          </Txt>
        </View>

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          multiline
          placeholder="e.g. 2 chapatis, a cup of beans stew, 1 boiled egg and a mug of chai"
          placeholderTextColor={C.muted2}
          style={{ marginTop: 8, minHeight: 96, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: radius.lg, padding: 14, color: C.ink, fontFamily: font.body, fontSize: 15.5, textAlignVertical: 'top' }}
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
          onPress={() => onLog(items, undefined, 'Voice')}
        />
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────── shared building blocks ─────────────────── */

function NutritionScoreBar({ score }: { score: number }) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Txt f={font.bodyBold} size={14} color={C.ink}>
          Nutrition Score
        </Txt>
        <Txt f={font.monoBold} size={13} color={C.textSub}>
          {score} · {scoreLabel(score)}
        </Txt>
      </View>
      <View style={{ height: 12, borderRadius: 999, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#D64545', '#E7A33E', '#8FBE4B', '#2E9E5B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: 999 }}
        />
      </View>
      <View style={{ height: 0 }}>
        <View
          style={{
            position: 'absolute',
            top: -18,
            left: `${score}%`,
            marginLeft: -11,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: C.white,
            borderWidth: 3,
            borderColor: C.ink,
          }}
        />
      </View>
    </View>
  );
}

function NutritionLabel({ title, calories, protein, carbs, fat, fiber }: { title: string; calories: number; protein: number; carbs: number; fat: number; fiber: number }) {
  const score = nutritionScore({ calories, protein, carbs, fat, fiber });
  const Row = ({ label, value, unit, bold, indent }: { label: string; value: number; unit: string; bold?: boolean; indent?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: bold ? 0 : 1, borderTopColor: C.line2, paddingLeft: indent ? 14 : 0 }}>
      <Txt f={bold ? font.bodyBold : font.bodyMed} size={bold ? 14.5 : 13} color={bold ? C.ink : C.textSub}>
        {label}
      </Txt>
      <Txt f={bold ? font.monoBold : font.mono} size={bold ? 14.5 : 13} color={C.ink}>
        {num(Math.round(value))}{unit}
      </Txt>
    </View>
  );
  return (
    <View style={{ marginTop: 16, backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
          NUTRITION FACTS
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.brandTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Ionicons name="leaf" size={12} color={C.brandDark} />
          <Txt f={font.bodyBold} size={11.5} color={C.brandDark}>
            {score} · {scoreLabel(score)}
          </Txt>
        </View>
      </View>
      <Txt f={font.bodyBold} size={15} color={C.ink} numberOfLines={2} style={{ marginTop: 6 }}>
        {title}
      </Txt>
      <View style={{ height: 2, backgroundColor: C.ink, marginTop: 10, marginBottom: 2 }} />
      <Row label="Calories" value={calories} unit=" kcal" bold />
      <Row label="Protein" value={protein} unit="g" />
      <Row label="Carbs" value={carbs} unit="g" />
      <Row label="Fiber" value={fiber} unit="g" indent />
      <Row label="Fat" value={fat} unit="g" />
    </View>
  );
}

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
        style={({ pressed }) => ({ height: 54, borderRadius: radius.md, backgroundColor: C.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.9 : 1 })}>
        <Ionicons name="add-circle" size={20} color={C.white} />
        <Txt f={font.bold} size={16} color={C.white}>
          {label}
        </Txt>
        {kcal > 0 && (
          <Txt f={font.body} size={13} color="#EAF6EE">
            · {num(Math.round(kcal))} kcal
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
