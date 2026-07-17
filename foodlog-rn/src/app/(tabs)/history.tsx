// Trends — weekly & monthly overviews plus the day-by-day list. Three segments:
//   Week  → 7-day calorie strip, averages, meal split, top foods
//   Month → calorie heatmap, month stats, averages, meal split, top foods
//   Days  → the running list of logged days (opens a day detail)

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, MacroRow, Meter, Pill, StatCol } from '@/components/shared';
import {
  aggregate,
  buildDays,
  longestStreak,
  mealSplit,
  monthEndDate,
  monthStartDate,
  rangeKeys,
  topFoods,
  weekStartDate,
} from '@/data/analytics';
import { totalsOf } from '@/data/types';
import { useFoodlog } from '@/store';
import { alpha, C, calorieStatus, font, MEAL_ICON, radius } from '@/theme';
import { addDays, dateKey, friendlyDate, num, shortDate, todayKey } from '@/util';
import { Txt } from '@/ui';

type Seg = 'week' | 'month' | 'days';

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const { getDay, goals, loggedDayKeys } = useFoodlog();
  const [seg, setSeg] = useState<Seg>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 14 }}>
        <Txt f={font.black} size={26} color={C.white} style={{ letterSpacing: -0.6 }}>
          Trends
        </Txt>
        <Txt f={font.body} size={13} color="#B9B9B4" style={{ marginTop: 2 }}>
          Your nutrition across the week & month
        </Txt>
        <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF14', borderRadius: radius.pill, padding: 4, marginTop: 14 }}>
          {(['week', 'month', 'days'] as Seg[]).map((s) => {
            const active = seg === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSeg(s)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center', backgroundColor: active ? C.white : 'transparent' }}>
                <Txt f={font.bodyBold} size={13} color={active ? C.ink : '#CFCFCB'}>
                  {s === 'week' ? 'Week' : s === 'month' ? 'Month' : 'Days'}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 44, gap: 14 }} showsVerticalScrollIndicator={false}>
        {seg === 'week' && (
          <WeekView getDay={getDay} goals={goals} offset={weekOffset} setOffset={setWeekOffset} />
        )}
        {seg === 'month' && (
          <MonthView getDay={getDay} goals={goals} offset={monthOffset} setOffset={setMonthOffset} />
        )}
        {seg === 'days' && <DaysView keys={loggedDayKeys()} getDay={getDay} goals={goals} />}
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────── shared pieces ─────────────────────────── */

function Section({ kicker, children, style }: { kicker?: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 18 }, style]}>
      {kicker && (
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4, marginBottom: 14 }}>
          {kicker}
        </Txt>
      )}
      {children}
    </View>
  );
}

function NavRow({ label, onPrev, onNext, nextDisabled, onReset, resetLabel }: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={onPrev} hitSlop={10} style={{ width: 40, height: 36, justifyContent: 'center' }}>
        <Ionicons name="chevron-back" size={22} color={C.ink} />
      </Pressable>
      <Pressable onPress={onReset} disabled={!onReset} style={{ alignItems: 'center' }}>
        <Txt f={font.bold} size={15} color={C.ink}>
          {label}
        </Txt>
        {onReset && (
          <Txt f={font.bodySemi} size={10.5} color={C.brand} style={{ marginTop: 1 }}>
            {resetLabel}
          </Txt>
        )}
      </Pressable>
      <Pressable onPress={onNext} disabled={nextDisabled} hitSlop={10} style={{ width: 40, height: 36, justifyContent: 'center', alignItems: 'flex-end', opacity: nextDisabled ? 0.3 : 1 }}>
        <Ionicons name="chevron-forward" size={22} color={C.ink} />
      </Pressable>
    </View>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ width: '33.33%', paddingVertical: 10, paddingHorizontal: 4 }}>
      <Txt f={font.monoBold} size={20} color={C.ink}>
        {value}
      </Txt>
      <Txt f={font.body} size={10.5} color={C.muted} style={{ marginTop: 2 }}>
        {label}
      </Txt>
    </View>
  );
}

function MealSplitCard({ items }: { items: any[] }) {
  const slices = mealSplit(items);
  const max = Math.max(1, ...slices.map((s) => s.totals.calories));
  const total = slices.reduce((s, x) => s + x.totals.calories, 0) || 1;
  return (
    <Section kicker="WHERE CALORIES CAME FROM">
      <View style={{ gap: 14 }}>
        {slices.map((s) => (
          <View key={s.meal} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={MEAL_ICON[s.meal] as any} size={17} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt f={font.bodySemi} size={13} color={C.textSub}>
                {s.meal}
              </Txt>
              <Txt f={font.body} size={11} color={C.muted}>
                {Math.round((s.totals.calories / total) * 100)}% of calories
              </Txt>
              <View style={{ marginTop: 5 }}>
                <Meter fraction={s.totals.calories / max} fill={C.ink} height={6} />
              </View>
            </View>
            <Txt f={font.monoBold} size={13} color={C.ink}>
              {num(s.totals.calories)}
            </Txt>
          </View>
        ))}
      </View>
    </Section>
  );
}

function TopFoodsCard({ items }: { items: any[] }) {
  const top = topFoods(items, 6);
  return (
    <Section kicker="TOP FOODS">
      {top.length === 0 ? (
        <Txt f={font.body} size={12} color={C.muted}>
          No foods logged in this period yet.
        </Txt>
      ) : (
        <View style={{ gap: 12 }}>
          {top.map((f, i) => (
            <View key={f.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
                <Txt f={font.monoBold} size={12} color={C.muted}>
                  {i + 1}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt f={font.bodySemi} size={13} color={C.textSub} numberOfLines={1}>
                  {f.name}
                </Txt>
                <Txt f={font.body} size={11} color={C.muted}>
                  Logged {f.count}×
                </Txt>
              </View>
              <Txt f={font.monoBold} size={13} color={C.ink}>
                {num(f.kcal)}
              </Txt>
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

function MacroAvgCard({ avg, goals }: { avg: any; goals: any }) {
  return (
    <Section kicker="AVERAGE MACROS / LOGGED DAY">
      <View style={{ gap: 14 }}>
        <MacroRow name="Protein" value={avg.protein} goal={goals.protein} fill={C.protein} />
        <MacroRow name="Carbohydrates" value={avg.carbs} goal={goals.carbs} fill={C.carbs} />
        <MacroRow name="Fat" value={avg.fat} goal={goals.fat} fill={C.fat} />
        <MacroRow name="Fiber" value={avg.fiber} goal={goals.fiber} fill={C.fiber} />
      </View>
    </Section>
  );
}

/* ─────────────────────────────── week ──────────────────────────────── */

function WeekView({ getDay, goals, offset, setOffset }: any) {
  const start = useMemo(() => weekStartDate(addDays(new Date(), offset * 7)), [offset]);
  const keys = useMemo(() => rangeKeys(start, 7), [start]);
  const days = useMemo(() => buildDays(keys, getDay, goals), [keys, getDay, goals]);
  const agg = useMemo(() => aggregate(days, goals), [days, goals]);
  const isCurrent = offset === 0;
  const endKey = keys[6];
  const label = isCurrent ? 'This week' : `${shortDate(keys[0])} – ${shortDate(endKey)}`;
  const goalMax = Math.max(goals.calories * 1.1, ...days.map((d: any) => d.totals.calories), 1);
  const ringPct = Math.min(1, agg.avg.calories / (goals.calories || 1));

  return (
    <>
      <Section>
        <NavRow
          label={label}
          resetLabel="Jump to this week"
          onPrev={() => setOffset(offset - 1)}
          onNext={() => setOffset(offset + 1)}
          nextDisabled={isCurrent}
          onReset={isCurrent ? undefined : () => setOffset(0)}
        />
      </Section>

      {/* Hero: average per logged day */}
      <Section>
        <Txt f={font.mono} size={11} color={C.muted} style={{ letterSpacing: 1.4 }}>
          AVERAGE / LOGGED DAY
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, marginBottom: 12 }}>
          <Txt f={font.black} size={34} color={C.ink} style={{ letterSpacing: -1 }}>
            {num(agg.avg.calories)}
          </Txt>
          <Txt f={font.body} size={13} color={C.muted} style={{ marginLeft: 6, marginBottom: 5 }}>
            of {num(goals.calories)} kcal
          </Txt>
        </View>
        <Meter fraction={ringPct} fill={C.ink} height={9} />
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <StatCol value={`${agg.logged.length}/7`} label="Days logged" />
          <StatCol value={`${agg.avgScore}`} label="Avg score" />
          <StatCol value={`${agg.onTarget}`} label="On target" />
        </View>
      </Section>

      {/* 7-day strip */}
      <Section kicker="DAILY CALORIES — TAP A DAY">
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {days.map((d: any) => {
            const cal = d.totals.calories;
            const frac = cal ? Math.max(0.05, cal / goalMax) : 0;
            const onT = cal && Math.abs(cal - goals.calories) <= goals.calories * 0.12;
            const isToday = d.key === todayKey();
            return (
              <Pressable
                key={d.key}
                onPress={() => cal && router.push({ pathname: '/day/[key]', params: { key: d.key } })}
                style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Txt f={font.body} size={9.5} color={C.muted}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][keys.indexOf(d.key)]}
                </Txt>
                <Txt f={font.monoBold} size={12} color={isToday ? C.ink : C.textSub}>
                  {Number(d.key.slice(-2))}
                </Txt>
                <View style={{ width: 22, height: 92, borderRadius: 7, backgroundColor: C.line2, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: isToday ? 1.5 : 0, borderColor: C.ink }}>
                  <View style={{ height: Math.round(frac * 92), backgroundColor: onT ? C.success : cal ? C.ink : 'transparent' }} />
                </View>
                <Txt f={font.mono} size={9} color={cal ? C.ink : C.muted2}>
                  {cal ? num(cal) : '—'}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <MacroAvgCard avg={agg.avg} goals={goals} />
      <MealSplitCard items={agg.all} />
      <TopFoodsCard items={agg.all} />
    </>
  );
}

/* ─────────────────────────────── month ─────────────────────────────── */

function MonthView({ getDay, goals, offset, setOffset }: any) {
  const anchor = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }, [offset]);
  const mStart = monthStartDate(anchor);
  const mEnd = monthEndDate(anchor);
  const monthKeys = useMemo(() => rangeKeys(mStart, mEnd.getDate()), [mStart, mEnd]);
  const days = useMemo(() => buildDays(monthKeys, getDay, goals), [monthKeys, getDay, goals]);
  const agg = useMemo(() => aggregate(days, goals), [days, goals]);
  const isCurrent = offset === 0;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = isCurrent ? 'This month' : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  // heatmap grid (Mon-based, 6 weeks)
  const gridStart = weekStartDate(mStart);
  const gridKeys = rangeKeys(gridStart, 42);
  const streak = longestStreak(days);

  return (
    <>
      <Section>
        <NavRow
          label={label}
          resetLabel="Jump to this month"
          onPrev={() => setOffset(offset - 1)}
          onNext={() => setOffset(offset + 1)}
          nextDisabled={isCurrent}
          onReset={isCurrent ? undefined : () => setOffset(0)}
        />
      </Section>

      <Section>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <StatCell value={num(agg.avg.calories)} label="Avg kcal/day" />
          <StatCell value={`${agg.logged.length}/${days.length}`} label="Days logged" />
          <StatCell value={`${streak}`} label="Longest streak" />
          <StatCell value={`${agg.all.length}`} label="Total meals" />
          <StatCell value={`${agg.avgScore}`} label="Avg score" />
          <StatCell value={`${agg.onTarget}`} label="On target" />
        </View>
      </Section>

      {/* Heatmap */}
      <Section kicker="CALORIE HEATMAP — TAP A DAY">
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Txt key={i} f={font.body} size={9.5} color={C.muted} style={{ flex: 1, textAlign: 'center' }}>
              {d}
            </Txt>
          ))}
        </View>
        <View style={{ gap: 5 }}>
          {Array.from({ length: 6 }).map((_, row) => (
            <View key={row} style={{ flexDirection: 'row', gap: 5 }}>
              {gridKeys.slice(row * 7, row * 7 + 7).map((k) => {
                const stat = days.find((d: any) => d.key === k);
                const cal = stat?.totals.calories || 0;
                const outside = k < monthKeys[0] || k > monthKeys[monthKeys.length - 1];
                const future = k > todayKey();
                const intensity = Math.min(1.3, cal / (goals.calories || 2000));
                const bg = cal ? alpha(C.success, 0.16 + intensity * 0.6) : C.bg;
                const onT = cal && Math.abs(cal - goals.calories) <= goals.calories * 0.12;
                const isToday = k === todayKey();
                return (
                  <Pressable
                    key={k}
                    disabled={!cal}
                    onPress={() => router.push({ pathname: '/day/[key]', params: { key: k } })}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 8,
                      backgroundColor: bg,
                      borderWidth: isToday ? 1.5 : onT ? 1.5 : 1,
                      borderColor: isToday ? C.ink : onT ? C.success : C.line,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: outside ? 0.3 : future && !cal ? 0.5 : 1,
                    }}>
                    <Txt f={font.monoBold} size={11} color={cal ? C.brandDark : C.textSub}>
                      {Number(k.slice(-2))}
                    </Txt>
                    {cal > 0 && (
                      <Txt f={font.mono} size={7.5} color={C.brandDark}>
                        {num(cal)}
                      </Txt>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 }}>
          <Txt f={font.body} size={9.5} color={C.muted}>
            Less
          </Txt>
          {[0.18, 0.38, 0.56, 0.76].map((a, i) => (
            <View key={i} style={{ width: 15, height: 12, borderRadius: 3, backgroundColor: alpha(C.success, a), borderWidth: 1, borderColor: C.line }} />
          ))}
          <Txt f={font.body} size={9.5} color={C.muted}>
            More
          </Txt>
        </View>
      </Section>

      <MacroAvgCard avg={agg.avg} goals={goals} />
      <MealSplitCard items={agg.all} />
      <TopFoodsCard items={agg.all} />
    </>
  );
}

/* ──────────────────────────────── days ─────────────────────────────── */

function DaysView({ keys, getDay, goals }: any) {
  if (!keys.length) {
    return <EmptyState icon="calendar-outline" title="No logged days yet" sub="Log a meal on the Today tab and your days will appear here." />;
  }
  return (
    <>
      {keys.map((key: string) => {
        const items = getDay(key).items;
        const t = totalsOf(items);
        const st = calorieStatus(t.calories, goals.calories);
        return (
          <Pressable
            key={key}
            onPress={() => router.push({ pathname: '/day/[key]', params: { key } })}
            style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: radius.lg, borderWidth: 1, borderColor: C.line, padding: 16, opacity: pressed ? 0.9 : 1 })}>
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
      })}
    </>
  );
}
