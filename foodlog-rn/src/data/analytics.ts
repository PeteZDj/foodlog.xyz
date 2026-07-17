// Aggregation helpers for the Weekly & Monthly overview screens. Pure functions
// over the same offline state the rest of the app uses — no side effects.

import { DayEntry, DayTotals, FoodItem, Goals, MealName, emptyTotals, totalsOf } from './types';
import { addDays, dateKey } from '@/util';

/** Monday-based start of the week containing `d` (local, midnight). */
export function weekStartDate(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - offset);
  return x;
}

export function monthStartDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function monthEndDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Sequential yyyy-MM-dd keys starting at `start` for `count` days. */
export function rangeKeys(start: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => dateKey(addDays(start, i)));
}

/** Nutrition-quality score 0..100 (mirrors the web app's qualityScore). */
export function dayScore(t: DayTotals, items: FoodItem[], goals: Goals): number {
  if (!t.calories) return 0;
  const parts: [number, number][] = [
    [t.calories, goals.calories],
    [t.protein, goals.protein],
    [t.carbs, goals.carbs],
    [t.fat, goals.fat],
    [t.fiber, goals.fiber],
  ];
  const ratios = parts.map(([v, g]) => Math.max(0, Math.min(1, 1 - Math.abs(1 - v / (g || 1)))));
  const variety = Math.min(1, new Set(items.map((i) => i.category || i.name)).size / 5);
  return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length * 0.85 + variety * 0.15) * 100);
}

export interface DayStat {
  key: string;
  items: FoodItem[];
  totals: DayTotals;
  score: number;
}

export interface PeriodAgg {
  days: DayStat[];
  logged: DayStat[];
  all: FoodItem[];
  totals: DayTotals;
  avg: DayTotals; // per logged day
  divisor: number;
  avgScore: number;
  onTarget: number; // days within 12% of the calorie goal
}

export function buildDays(keys: string[], getDay: (k: string) => DayEntry, goals: Goals): DayStat[] {
  return keys.map((key) => {
    const items = getDay(key).items || [];
    const totals = totalsOf(items);
    return { key, items, totals, score: items.length ? dayScore(totals, items, goals) : 0 };
  });
}

export function aggregate(days: DayStat[], goals: Goals): PeriodAgg {
  const logged = days.filter((d) => d.totals.calories > 0);
  const all = logged.flatMap((d) => d.items);
  const totals = totalsOf(all);
  const divisor = logged.length || 1;
  const avg = scaleTotals(totals, 1 / divisor);
  const avgScore = logged.length ? Math.round(logged.reduce((s, d) => s + d.score, 0) / logged.length) : 0;
  const onTarget = logged.filter((d) => Math.abs(d.totals.calories - goals.calories) <= goals.calories * 0.12).length;
  return { days, logged, all, totals, avg, divisor, avgScore, onTarget };
}

function scaleTotals(t: DayTotals, factor: number): DayTotals {
  const out = emptyTotals();
  (Object.keys(out) as (keyof DayTotals)[]).forEach((k) => {
    out[k] = (t[k] || 0) * factor;
  });
  out.items = t.items; // count stays absolute
  return out;
}

/** Longest run of consecutive logged days within the given ordered day list. */
export function longestStreak(days: DayStat[]): number {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    if (d.totals.calories > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else run = 0;
  }
  return longest;
}

export interface TopFood {
  name: string;
  category?: string;
  count: number;
  kcal: number;
}

export function topFoods(items: FoodItem[], limit = 6): TopFood[] {
  const map = new Map<string, TopFood>();
  for (const it of items) {
    const key = it.name;
    if (!map.has(key)) map.set(key, { name: it.name, category: it.category, count: 0, kcal: 0 });
    const rec = map.get(key)!;
    rec.count += 1;
    rec.kcal += (it.calories || 0) * (it.servings || 1);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.kcal - a.kcal).slice(0, limit);
}

export interface MealSlice {
  meal: MealName;
  totals: DayTotals;
}

export function mealSplit(items: FoodItem[]): MealSlice[] {
  const meals: MealName[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  return meals.map((meal) => ({ meal, totals: totalsOf(items.filter((i) => i.meal === meal)) }));
}
