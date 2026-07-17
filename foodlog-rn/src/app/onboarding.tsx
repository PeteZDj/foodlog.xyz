// First-run profile form. New accounts land here (route guard) to set the basics
// we need to personalise calorie & macro targets. Everything is editable later
// in Account → Goals. On finish we compute goals and mark the account onboarded.

import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

const GENDERS = ['Female', 'Male', 'Other'];
const GOALS = ['Lose weight', 'Maintain', 'Gain weight'];
const ACTIVITY = [
  ['Sedentary', 'Little / no exercise', 1.2],
  ['Light', 'Exercise 1–3 days/wk', 1.375],
  ['Moderate', 'Exercise 3–5 days/wk', 1.55],
  ['Very active', 'Exercise 6–7 days/wk', 1.725],
] as const;

function computeGoals(opts: {
  gender: string;
  age: number;
  height: number;
  weight: number;
  activity: number;
  goal: string;
}) {
  const { gender, age, height, weight, activity, goal } = opts;
  const valid = age > 0 && height > 0 && weight > 0;
  let calories = 2200;
  if (valid) {
    const genderOffset = gender === 'Male' ? 5 : gender === 'Female' ? -161 : -78;
    const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
    const tdee = bmr * activity;
    const adj = goal === 'Lose weight' ? -400 : goal === 'Gain weight' ? 300 : 0;
    calories = Math.round(Math.max(1200, Math.min(4000, tdee + adj)) / 10) * 10;
  }
  return {
    calories,
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.42) / 4),
    fat: Math.round((calories * 0.28) / 9),
    fiber: Math.max(20, Math.round((calories / 1000) * 14)),
    water: 8,
  };
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, completeOnboarding } = useFoodlog();
  const [name, setName] = useState(profile.displayName || user?.name || '');
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [goal, setGoal] = useState('Maintain');
  const [activity, setActivity] = useState(1.375);
  const [error, setError] = useState('');

  const finish = () => {
    setError('');
    if (!name.trim()) return setError('Please tell us your name.');
    const goals = computeGoals({
      gender,
      age: Number(age) || 0,
      height: Number(height) || 0,
      weight: Number(weight) || 0,
      activity,
      goal,
    });
    completeOnboarding(
      {
        displayName: name.trim(),
        gender,
        age: Number(age) || undefined,
        height: Number(height) || undefined,
        currentWeight: Number(weight) || undefined,
        goalWeight: Number(goalWeight) || undefined,
        primaryGoal: goal,
        activityLevel: ACTIVITY.find((a) => a[2] === activity)?.[0],
        weightUnit: 'kg',
      },
      goals,
    );
    router.replace('/');
  };

  const preview = computeGoals({
    gender,
    age: Number(age) || 0,
    height: Number(height) || 0,
    weight: Number(weight) || 0,
    activity,
    goal,
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 18 }}>
        <Txt f={font.mono} size={11} color={C.brandLight} style={{ letterSpacing: 1.6 }}>
          WELCOME TO FOODLOG
        </Txt>
        <Txt f={font.black} size={25} color={C.white} style={{ marginTop: 6, letterSpacing: -0.6 }}>
          Let's set you up
        </Txt>
        <Txt f={font.body} size={13} color="#B9B9B4" style={{ marginTop: 3 }}>
          A few details so your targets fit you. You can change these anytime.
        </Txt>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Section label="YOUR NAME">
          <Input value={name} onChangeText={setName} placeholder="e.g. Amara" autoCapitalize="words" />
        </Section>

        <Section label="GENDER">
          <ChipRow options={GENDERS} value={gender} onChange={setGender} />
        </Section>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Section label="AGE" style={{ flex: 1 }}>
            <Input value={age} onChangeText={setAge} placeholder="27" keyboardType="number-pad" suffix="yrs" />
          </Section>
          <Section label="HEIGHT" style={{ flex: 1 }}>
            <Input value={height} onChangeText={setHeight} placeholder="170" keyboardType="number-pad" suffix="cm" />
          </Section>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Section label="CURRENT WEIGHT" style={{ flex: 1 }}>
            <Input value={weight} onChangeText={setWeight} placeholder="70" keyboardType="decimal-pad" suffix="kg" />
          </Section>
          <Section label="GOAL WEIGHT" style={{ flex: 1 }}>
            <Input value={goalWeight} onChangeText={setGoalWeight} placeholder="66" keyboardType="decimal-pad" suffix="kg" />
          </Section>
        </View>

        <Section label="YOUR GOAL">
          <ChipRow options={GOALS} value={goal} onChange={setGoal} />
        </Section>

        <Section label="ACTIVITY LEVEL">
          <View style={{ gap: 8 }}>
            {ACTIVITY.map(([title, sub, factor]) => {
              const active = activity === factor;
              return (
                <Pressable
                  key={title}
                  onPress={() => setActivity(factor)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderRadius: radius.md,
                    backgroundColor: active ? C.ink : C.card,
                    borderWidth: 1,
                    borderColor: active ? C.ink : C.line,
                  }}>
                  <View>
                    <Txt f={font.bodyBold} size={14} color={active ? C.white : C.ink}>
                      {title}
                    </Txt>
                    <Txt f={font.body} size={11.5} color={active ? '#B9B9B4' : C.muted}>
                      {sub}
                    </Txt>
                  </View>
                  {active && <Txt f={font.mono} size={12} color={C.brandLight}>✓</Txt>}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <View style={{ backgroundColor: C.brandTint, borderRadius: radius.lg, borderWidth: 1, borderColor: C.brandMuted, padding: 16 }}>
          <Txt f={font.mono} size={11} color={C.brandDark} style={{ letterSpacing: 1.2 }}>
            YOUR DAILY TARGET
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
            <Txt f={font.black} size={32} color={C.brandDark} style={{ letterSpacing: -1 }}>
              {preview.calories.toLocaleString('en-US')}
            </Txt>
            <Txt f={font.body} size={13} color={C.brandDark} style={{ marginBottom: 5, opacity: 0.8 }}>
              kcal / day
            </Txt>
          </View>
          <Txt f={font.bodyMed} size={12.5} color={C.brandDark} style={{ marginTop: 4, opacity: 0.9 }}>
            Protein {preview.protein}g · Carbs {preview.carbs}g · Fat {preview.fat}g · Fiber {preview.fiber}g
          </Txt>
        </View>

        {!!error && (
          <Txt f={font.bodyMed} size={13} color={C.danger}>
            {error}
          </Txt>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line }}>
        <Pressable
          onPress={finish}
          style={({ pressed }) => ({ height: 54, borderRadius: radius.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
          <Txt f={font.bold} size={16} color={C.white}>
            Start tracking
          </Txt>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={style}>
      <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.3, marginBottom: 8 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

function Input({ suffix, ...props }: React.ComponentProps<typeof TextInput> & { suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: radius.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 52 }}>
      <TextInput
        placeholderTextColor={C.muted2}
        style={{ flex: 1, color: C.ink, fontFamily: font.bodyMed, fontSize: 16 }}
        {...props}
      />
      {suffix && (
        <Txt f={font.bodyMed} size={13} color={C.muted}>
          {suffix}
        </Txt>
      )}
    </View>
  );
}

function ChipRow({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: active ? C.ink : C.card,
              borderWidth: 1,
              borderColor: active ? C.ink : C.line,
            }}>
            <Txt f={font.bodySemi} size={13} color={active ? C.white : C.textSub}>
              {opt}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
