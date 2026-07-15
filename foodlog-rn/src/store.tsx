// Foodlog client state — offline-first. The whole tracker state (goals, profile,
// date-keyed entries, weights, exercises, custom foods) is persisted to
// AsyncStorage in the exact shape the web/MAUI clients sync. There is no server
// dependency: logging, editing and history all work on-device ("private storage").

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DayEntry,
  DayTotals,
  ExerciseEntry,
  Food,
  FoodItem,
  FoodlogState,
  Goals,
  MealName,
  Profile,
  WeightEntry,
  totalsOf,
} from '@/data/types';
import { DEMO_USER, seedState } from '@/data/seed';
import { FOODS } from '@/data/foods';
import { todayKey, uid } from '@/util';

const STATE_KEY = 'foodlog_state_v1';
const USER_KEY = 'foodlog_user_v1';

export interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface Ctx {
  ready: boolean;
  user: User | null;
  login: (user?: Partial<User>) => void;
  logout: () => void;

  state: FoodlogState;
  goals: Goals;
  profile: Profile;

  getDay: (key: string) => DayEntry;
  totalsFor: (key: string) => DayTotals;
  loggedDayKeys: () => string[];

  logFood: (key: string, food: Food, meal: MealName, servings: number) => void;
  addItem: (key: string, item: FoodItem) => void;
  updateItem: (key: string, id: string, patch: Partial<FoodItem>) => void;
  removeItem: (key: string, id: string) => void;
  setWater: (key: string, glasses: number) => void;

  setGoals: (patch: Partial<Goals>) => void;
  setProfile: (patch: Partial<Profile>) => void;

  addWeight: (w: WeightEntry) => void;
  addExercise: (e: Omit<ExerciseEntry, 'id'>) => void;

  customFoods: Food[];
  addCustomFood: (f: Omit<Food, 'id' | 'source'>) => Food;
  recentFoods: Food[];
}

const FoodlogContext = createContext<Ctx | null>(null);

export function FoodlogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<FoodlogState>(() => seedState());

  useEffect(() => {
    (async () => {
      try {
        const [rawState, rawUser] = await Promise.all([
          AsyncStorage.getItem(STATE_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (rawState) {
          setState({ ...seedState(), ...JSON.parse(rawState) });
        }
        if (rawUser) {
          setUser(JSON.parse(rawUser));
        } else {
          // First launch: sign the demo user in so the app is immediately useful.
          const demo = { name: DEMO_USER.name, email: DEMO_USER.email };
          setUser(demo);
          AsyncStorage.setItem(USER_KEY, JSON.stringify(demo));
        }
      } catch {
        // keep seed
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next: FoodlogState) => {
    setState(next);
    AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const login = useCallback((u?: Partial<User>) => {
    const next: User = {
      name: u?.name || DEMO_USER.name,
      email: u?.email || DEMO_USER.email,
      avatar: u?.avatar,
    };
    setUser(next);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    AsyncStorage.removeItem(USER_KEY).catch(() => {});
  }, []);

  const getDay = useCallback(
    (key: string): DayEntry => state.entries[key] ?? { water: 0, items: [] },
    [state.entries],
  );

  const totalsFor = useCallback((key: string) => totalsOf(getDay(key).items), [getDay]);

  const loggedDayKeys = useCallback(
    () =>
      Object.keys(state.entries)
        .filter((k) => (state.entries[k]?.items?.length ?? 0) > 0 && k <= todayKey())
        .sort((a, b) => (a < b ? 1 : -1)),
    [state.entries],
  );

  const mutateDay = useCallback(
    (key: string, fn: (day: DayEntry) => DayEntry) => {
      const day = state.entries[key] ?? { water: 0, items: [] };
      const next: FoodlogState = {
        ...state,
        entries: { ...state.entries, [key]: fn({ water: day.water, items: [...day.items] }) },
      };
      persist(next);
    },
    [state, persist],
  );

  const addItem = useCallback(
    (key: string, item: FoodItem) => mutateDay(key, (d) => ({ ...d, items: [...d.items, item] })),
    [mutateDay],
  );

  const logFood = useCallback(
    (key: string, food: Food, meal: MealName, servings: number) => {
      const item: FoodItem = {
        id: uid(),
        name: food.name,
        serving: food.serving,
        meal,
        category: food.category,
        servings,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar,
        sodium: food.sodium,
        satFat: food.satFat,
        loggedAt: new Date().toISOString(),
      };
      const recents = [food.id, ...state.recentFoodIds.filter((i) => i !== food.id)].slice(0, 20);
      const day = state.entries[key] ?? { water: 0, items: [] };
      persist({
        ...state,
        recentFoodIds: recents,
        entries: { ...state.entries, [key]: { water: day.water, items: [...day.items, item] } },
      });
    },
    [state, persist],
  );

  const updateItem = useCallback(
    (key: string, id: string, patch: Partial<FoodItem>) =>
      mutateDay(key, (d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),
    [mutateDay],
  );

  const removeItem = useCallback(
    (key: string, id: string) => mutateDay(key, (d) => ({ ...d, items: d.items.filter((it) => it.id !== id) })),
    [mutateDay],
  );

  const setWater = useCallback(
    (key: string, glasses: number) => mutateDay(key, (d) => ({ ...d, water: Math.max(0, glasses) })),
    [mutateDay],
  );

  const setGoals = useCallback(
    (patch: Partial<Goals>) => persist({ ...state, goals: { ...state.goals, ...patch } }),
    [state, persist],
  );

  const setProfile = useCallback(
    (patch: Partial<Profile>) => persist({ ...state, profile: { ...state.profile, ...patch } }),
    [state, persist],
  );

  const addWeight = useCallback(
    (w: WeightEntry) => {
      const weights = [...state.weights.filter((x) => x.date !== w.date), w].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      );
      persist({ ...state, weights, profile: { ...state.profile, currentWeight: w.weight } });
    },
    [state, persist],
  );

  const addExercise = useCallback(
    (e: Omit<ExerciseEntry, 'id'>) => persist({ ...state, exercises: [{ ...e, id: uid() }, ...state.exercises] }),
    [state, persist],
  );

  const addCustomFood = useCallback(
    (f: Omit<Food, 'id' | 'source'>): Food => {
      const food: Food = { ...f, id: `c_${uid()}`, source: 'custom' };
      persist({ ...state, customFoods: [food, ...state.customFoods] });
      return food;
    },
    [state, persist],
  );

  const recentFoods = useMemo(() => {
    const all = [...state.customFoods, ...FOODS];
    const map = new Map(all.map((f) => [f.id, f]));
    return state.recentFoodIds.map((id) => map.get(id)).filter(Boolean) as Food[];
  }, [state.recentFoodIds, state.customFoods]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      user,
      login,
      logout,
      state,
      goals: state.goals,
      profile: state.profile,
      getDay,
      totalsFor,
      loggedDayKeys,
      logFood,
      addItem,
      updateItem,
      removeItem,
      setWater,
      setGoals,
      setProfile,
      addWeight,
      addExercise,
      customFoods: state.customFoods,
      addCustomFood,
      recentFoods,
    }),
    [ready, user, state, login, logout, getDay, totalsFor, loggedDayKeys, logFood, addItem, updateItem, removeItem, setWater, setGoals, setProfile, addWeight, addExercise, addCustomFood, recentFoods],
  );

  return <FoodlogContext.Provider value={value}>{children}</FoodlogContext.Provider>;
}

export function useFoodlog(): Ctx {
  const ctx = useContext(FoodlogContext);
  if (!ctx) throw new Error('useFoodlog must be used within FoodlogProvider');
  return ctx;
}
