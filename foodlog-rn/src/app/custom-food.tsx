import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailHeader } from '@/components/shared';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

export default function CustomFoodScreen() {
  const insets = useSafeAreaInsets();
  const { addCustomFood } = useFoodlog();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');

  const numOr0 = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };
  const valid = name.trim().length > 0 && numOr0(calories) >= 0 && calories.trim() !== '';

  const save = () => {
    const food = addCustomFood({
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: 'Custom',
      serving: serving.trim() || '1 serving',
      grams: 0,
      calories: numOr0(calories),
      protein: numOr0(protein),
      carbs: numOr0(carbs),
      fat: numOr0(fat),
      fiber: numOr0(fiber),
      sugar: sugar.trim() ? numOr0(sugar) : undefined,
      sodium: sodium.trim() ? numOr0(sodium) : undefined,
    });
    router.replace({ pathname: '/food/[id]', params: { id: food.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <DetailHeader title="Create custom food" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14 }}>
            <Field label="Name" value={name} onChange={setName} placeholder="e.g. Grandma's granola" />
            <Field label="Brand (optional)" value={brand} onChange={setBrand} placeholder="e.g. Homemade" />
            <Field label="Serving" value={serving} onChange={setServing} placeholder="e.g. 1 cup (60 g)" />
          </View>

          <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginTop: 18, marginBottom: 10, marginLeft: 2 }}>
            NUTRITION PER SERVING
          </Txt>
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 14 }}>
            <Field label="Calories (kcal)" value={calories} onChange={setCalories} keyboard placeholder="0" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Protein (g)" value={protein} onChange={setProtein} keyboard placeholder="0" flex />
              <Field label="Carbs (g)" value={carbs} onChange={setCarbs} keyboard placeholder="0" flex />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Fat (g)" value={fat} onChange={setFat} keyboard placeholder="0" flex />
              <Field label="Fiber (g)" value={fiber} onChange={setFiber} keyboard placeholder="0" flex />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field label="Sugar (g)" value={sugar} onChange={setSugar} keyboard placeholder="—" flex />
              <Field label="Sodium (mg)" value={sodium} onChange={setSodium} keyboard placeholder="—" flex />
            </View>
          </View>

          <Pressable
            onPress={save}
            disabled={!valid}
            style={({ pressed }) => ({ marginTop: 20, height: 54, borderRadius: radius.md, backgroundColor: valid ? C.ink : C.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Txt f={font.bold} size={16} color={valid ? C.white : C.muted}>
              Save food
            </Txt>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  flex,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  keyboard?: boolean;
  flex?: boolean;
}) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Txt f={font.bodySemi} size={12.5} color={C.muted} style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted2}
        keyboardType={keyboard ? 'decimal-pad' : 'default'}
        style={{
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: radius.sm,
          paddingHorizontal: 12,
          height: 46,
          fontFamily: font.bodyMed,
          fontSize: 15,
          color: C.ink,
          backgroundColor: C.bg,
        }}
      />
    </View>
  );
}
