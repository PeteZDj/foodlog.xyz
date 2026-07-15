import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from '@/charts';
import { DetailHeader, EmptyState } from '@/components/shared';
import { useFoodlog } from '@/store';
import { C, font, radius } from '@/theme';
import { round1, shortDate, todayKey } from '@/util';
import { Txt } from '@/ui';

export default function WeightScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, profile, addWeight } = useFoodlog();
  const [input, setInput] = useState('');

  const unit = profile.weightUnit || 'kg';
  const weights = state.weights;
  const latest = weights[weights.length - 1]?.weight ?? profile.currentWeight ?? 0;
  const start = weights[0]?.weight ?? latest;
  const delta = latest - start;

  const add = () => {
    const w = parseFloat(input);
    if (!Number.isFinite(w) || w <= 0) return;
    addWeight({ date: todayKey(), weight: w });
    setInput('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <DetailHeader title="Weight & progress" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18 }}>
          <View style={{ flexDirection: 'row' }}>
            <Stat label="Current" value={`${round1(latest)}`} unit={unit} />
            <Stat label="Goal" value={profile.goalWeight ? `${round1(profile.goalWeight)}` : '—'} unit={profile.goalWeight ? unit : ''} />
            <Stat label="Change" value={`${delta > 0 ? '+' : ''}${round1(delta)}`} unit={unit} color={delta <= 0 ? C.success : C.textSub} />
          </View>
          {weights.length >= 2 && (
            <View style={{ marginTop: 12 }}>
              <LineChart
                data={weights.map((w) => w.weight)}
                labels={weights.map((w) => shortDate(w.date))}
                width={width - 32 - 36}
                height={170}
                color={C.ink}
              />
            </View>
          )}
        </View>

        {/* Add weight */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
          <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginBottom: 10 }}>
            LOG TODAY'S WEIGHT
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder={`Weight in ${unit}`}
              placeholderTextColor={C.muted2}
              style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: radius.sm, paddingHorizontal: 14, height: 50, fontFamily: font.bodyMed, fontSize: 16, color: C.ink, backgroundColor: C.bg }}
            />
            <Pressable onPress={add} style={({ pressed }) => ({ paddingHorizontal: 22, borderRadius: radius.sm, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
              <Txt f={font.bold} size={15} color={C.white}>
                Add
              </Txt>
            </Pressable>
          </View>
        </View>

        {/* History */}
        {weights.length === 0 ? (
          <EmptyState icon="barbell-outline" title="No weigh-ins yet" sub="Log your weight to see your trend over time." />
        ) : (
          <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16 }}>
            <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.2, marginBottom: 6 }}>
              HISTORY
            </Txt>
            {[...weights].reverse().map((w, i) => (
              <View key={w.date + i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line2 }}>
                <Txt f={font.bodyMed} size={13.5} color={C.textSub}>
                  {shortDate(w.date)}
                </Txt>
                <Txt f={font.bold} size={13.5} color={C.ink}>
                  {round1(w.weight)} {unit}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, unit, color = C.ink }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt f={font.body} size={11.5} color={C.muted}>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        <Txt f={font.black} size={24} color={color} style={{ letterSpacing: -0.5 }}>
          {value}
        </Txt>
        <Txt f={font.body} size={12} color={C.muted} style={{ marginBottom: 4 }}>
          {unit}
        </Txt>
      </View>
    </View>
  );
}
