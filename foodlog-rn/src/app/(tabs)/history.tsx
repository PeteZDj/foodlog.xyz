import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from '@/charts';
import { EmptyState, Header, Pill } from '@/components/shared';
import { totalsOf } from '@/data/types';
import { useFoodlog } from '@/store';
import { C, calorieStatus, font, radius } from '@/theme';
import { addDays, dateKey, friendlyDate, num } from '@/util';
import { Txt } from '@/ui';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { loggedDayKeys, getDay, goals } = useFoodlog();
  const keys = loggedDayKeys();

  const week = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(today, i - 6);
      const key = dateKey(d);
      const t = totalsOf(getDay(key).items);
      return { label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], value: Math.round(t.calories) };
    });
  }, [getDay]);

  const avg = Math.round(week.reduce((s, d) => s + d.value, 0) / (week.filter((d) => d.value > 0).length || 1));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top }}>
        <Header title="History" subtitle="Your nutrition, day by day" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Weekly trend */}
        <View style={{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
                LAST 7 DAYS
              </Txt>
              <Txt f={font.black} size={22} color={C.ink} style={{ marginTop: 2 }}>
                {num(avg)} <Txt f={font.body} size={12} color={C.muted}>kcal / day avg</Txt>
              </Txt>
            </View>
            <Txt f={font.body} size={12} color={C.muted}>
              Goal {num(goals.calories)}
            </Txt>
          </View>
          <BarChart data={week} height={150} color={C.ink} />
        </View>

        {keys.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No logged days yet" sub="Log a meal on the Today tab and your days will appear here." />
        ) : (
          keys.map((key) => {
            const items = getDay(key).items;
            const t = totalsOf(items);
            const st = calorieStatus(t.calories, goals.calories);
            return (
              <Pressable
                key={key}
                onPress={() => router.push({ pathname: '/day/[key]', params: { key } })}
                style={({ pressed }) => ({
                  backgroundColor: C.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: C.line,
                  padding: 16,
                  opacity: pressed ? 0.9 : 1,
                })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Txt f={font.bold} size={14.5} color={C.ink}>
                      {friendlyDate(key)}
                    </Txt>
                    <Txt f={font.body} size={11} color={C.muted}>
                      {t.items} item{t.items === 1 ? '' : 's'}
                    </Txt>
                  </View>
                  <Pill label={st.label === 'In progress' ? 'Under' : st.label === 'On track' ? 'On track' : 'Over'} bg={st.bg} fg={st.fg} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
                  <Txt f={font.black} size={22} color={C.ink}>
                    {num(t.calories)}
                  </Txt>
                  <Txt f={font.body} size={12} color={C.muted} style={{ marginLeft: 6, marginBottom: 3 }}>
                    of {num(goals.calories)} kcal
                  </Txt>
                </View>
                <Txt f={font.bodyMed} size={12} color={C.textSub} style={{ marginTop: 6 }}>
                  P {Math.round(t.protein)}  ·  C {Math.round(t.carbs)}  ·  F {Math.round(t.fat)} g
                </Txt>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
