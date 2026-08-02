// Foodlog client state — account-backed & offline-capable. The whole tracker
// state (goals, profile, date-keyed entries, weights, exercises, custom foods,
// meal photos) is cached to AsyncStorage AND synced to the server per account,
// so the phone and the website share one live log. Meal photos ride along as
// base64 on each item, exactly like the web client, so they show up on both.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  DayEntry,
  DayTotals,
  DEFAULT_GOALS,
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
import { FOODS } from '@/data/foods';
import { api, ApiUser } from '@/data/api';
import { mergeFoodlogState } from '@/data/merge';
import { todayKey, uid } from '@/util';

const STATE_KEY = 'foodlog_state_v2';
const AUTH_KEY = 'foodlog_auth_v1';

export interface User {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Auth {
  token: string;
  user: User;
}

function emptyState(): FoodlogState {
  return {
    goals: { ...DEFAULT_GOALS },
    profile: {},
    entries: {},
    weights: [],
    exercises: [],
    customFoods: [],
    recentFoodIds: [],
    onboarded: false,
  };
}

/** Normalise a server state blob into a full FoodlogState (older web states may omit keys). */
function hydrate(raw: any): FoodlogState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    goals: { ...base.goals, ...(raw.goals || {}) },
    profile: { ...(raw.profile || {}) },
    entries: raw.entries && typeof raw.entries === 'object' ? raw.entries : {},
    weights: Array.isArray(raw.weights) ? raw.weights : [],
    exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
    customFoods: Array.isArray(raw.customFoods) ? raw.customFoods : [],
    recentFoodIds: Array.isArray(raw.recentFoodIds) ? raw.recentFoodIds : [],
    // Existing web users have real data but never set this flag — treat them as onboarded.
    onboarded: raw.onboarded !== false,
  };
}

interface Ctx {
  ready: boolean;
  user: User | null;
  token: string | null;
  onboarded: boolean;
  syncing: boolean;

  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithSession: (token: string, user: User) => Promise<void>;
  logout: () => void;
  completeOnboarding: (profile: Partial<Profile>, goals: Partial<Goals>) => void;

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
  const [auth, setAuth] = useState<Auth | null>(null);
  const [state, setState] = useState<FoodlogState>(() => emptyState());
  const [syncing, setSyncing] = useState(false);

  const stateRef = useRef(state);
  const authRef = useRef(auth);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { authRef.current = auth; }, [auth]);

  // ── boot: load cached auth + state, then validate & pull from the server ──
  useEffect(() => {
    (async () => {
      try {
        const [rawState, rawAuth] = await Promise.all([
          AsyncStorage.getItem(STATE_KEY),
          AsyncStorage.getItem(AUTH_KEY),
        ]);
        if (rawState) setState(hydrate(JSON.parse(rawState)));
        const savedAuth: Auth | null = rawAuth ? JSON.parse(rawAuth) : null;
        if (savedAuth?.token) {
          setAuth(savedAuth);
          setReady(true);
          // Validate + pull server state in the background.
          try {
            const me = await api.me(savedAuth.token);
            if (!me.user) {
              await clearAuth();
            } else {
              // Keep Google avatar fresh from /me
              if (me.user.avatar && me.user.avatar !== savedAuth.user.avatar) {
                const patched = { ...savedAuth, user: { ...savedAuth.user, ...me.user, avatar: me.user.avatar } };
                setAuth(patched);
                AsyncStorage.setItem(AUTH_KEY, JSON.stringify(patched)).catch(() => {});
              }
              const remote = await api.getState(savedAuth.token);
              if (remote.state) {
                const local = stateRef.current;
                const hydrated = hydrate(mergeFoodlogState(local, remote.state));
                setState(hydrated);
                AsyncStorage.setItem(STATE_KEY, JSON.stringify(hydrated)).catch(() => {});
                // Push merged state back so the website picks up phone-only items.
                api.putState(savedAuth.token, hydrated).catch(() => {});
              }
            }
          } catch {
            /* offline — keep cached state */
          }
          return;
        }
      } catch {
        /* fall through to empty */
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuth = useCallback(async () => {
    setAuth(null);
    setState(emptyState());
    await AsyncStorage.multiRemove([AUTH_KEY, STATE_KEY]).catch(() => {});
  }, []);

  // ── persistence: cache locally + debounce a push to the server ──
  const scheduleServerPush = useCallback(() => {
    const tok = authRef.current?.token;
    if (!tok) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      setSyncing(true);
      api
        .putState(tok, stateRef.current)
        .then((res: any) => {
          if (res?.state) {
            const hydrated = hydrate(res.state);
            stateRef.current = hydrated;
            setState(hydrated);
            AsyncStorage.setItem(STATE_KEY, JSON.stringify(hydrated)).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setSyncing(false));
    }, 1200);
  }, []);

  // Re-pull when the app returns to the foreground so website logs appear on phone.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active') return;
      const tok = authRef.current?.token;
      if (!tok) return;
      api.getState(tok).then((remote) => {
        if (!remote.state) return;
        const hydrated = hydrate(mergeFoodlogState(stateRef.current, remote.state));
        stateRef.current = hydrated;
        setState(hydrated);
        AsyncStorage.setItem(STATE_KEY, JSON.stringify(hydrated)).catch(() => {});
      }).catch(() => {});
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const persist = useCallback((next: FoodlogState) => {
    stateRef.current = next;
    setState(next);
    AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)).catch(() => {});
    scheduleServerPush();
  }, [scheduleServerPush]);

  const applyAuth = useCallback(async (result: { token: string; user: ApiUser }) => {
    const user: User = { id: result.user.id, name: result.user.name, email: result.user.email, avatar: result.user.avatar };
    const nextAuth: Auth = { token: result.token, user };
    setAuth(nextAuth);
    authRef.current = nextAuth;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(nextAuth)).catch(() => {});

    // Pull any existing account state and merge with anything already cached.
    let next: FoodlogState;
    try {
      const remote = await api.getState(result.token);
      next = remote.state ? hydrate(mergeFoodlogState(stateRef.current, remote.state)) : emptyState();
    } catch {
      next = emptyState();
    }
    if (!next.profile.displayName) next.profile.displayName = user.name;
    if (!next.profile.email) next.profile.email = user.email;
    if (user.avatar && !next.profile.photo) next.profile.photo = user.avatar;
    stateRef.current = next;
    setState(next);
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)).catch(() => {});
    setReady(true);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    await applyAuth(res);
  }, [applyAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await applyAuth(res);
  }, [applyAuth]);

  const signInWithSession = useCallback(async (token: string, user: User) => {
    await applyAuth({ token, user: { id: user.id || '', name: user.name, email: user.email, avatar: user.avatar } });
  }, [applyAuth]);

  const logout = useCallback(() => {
    const tok = authRef.current?.token;
    if (tok) api.logout(tok).catch(() => {});
    if (syncTimer.current) clearTimeout(syncTimer.current);
    clearAuth();
  }, [clearAuth]);

  const completeOnboarding = useCallback((profilePatch: Partial<Profile>, goalsPatch: Partial<Goals>) => {
    const next: FoodlogState = {
      ...stateRef.current,
      profile: { ...stateRef.current.profile, ...profilePatch },
      goals: { ...stateRef.current.goals, ...goalsPatch },
      onboarded: true,
    };
    persist(next);
  }, [persist]);

  // ── diary operations ──
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
      const day = stateRef.current.entries[key] ?? { water: 0, items: [] };
      persist({
        ...stateRef.current,
        entries: { ...stateRef.current.entries, [key]: fn({ water: day.water, items: [...day.items] }) },
      });
    },
    [persist],
  );

  const addItem = useCallback(
    (key: string, item: FoodItem) => mutateDay(key, (d) => ({ ...d, items: [...d.items, item] })),
    [mutateDay],
  );

  const logFood = useCallback(
    (key: string, food: Food, meal: MealName, servings: number) => {
      const id = uid();
      const item: FoodItem = {
        id,
        entryId: id,
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
      const recents = [food.id, ...stateRef.current.recentFoodIds.filter((i) => i !== food.id)].slice(0, 20);
      const day = stateRef.current.entries[key] ?? { water: 0, items: [] };
      persist({
        ...stateRef.current,
        recentFoodIds: recents,
        entries: { ...stateRef.current.entries, [key]: { water: day.water, items: [...day.items, item] } },
      });
    },
    [persist],
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
    (patch: Partial<Goals>) => persist({ ...stateRef.current, goals: { ...stateRef.current.goals, ...patch } }),
    [persist],
  );
  const setProfile = useCallback(
    (patch: Partial<Profile>) => persist({ ...stateRef.current, profile: { ...stateRef.current.profile, ...patch } }),
    [persist],
  );

  const addWeight = useCallback(
    (w: WeightEntry) => {
      const weights = [...stateRef.current.weights.filter((x) => x.date !== w.date), w].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      );
      persist({ ...stateRef.current, weights, profile: { ...stateRef.current.profile, currentWeight: w.weight } });
    },
    [persist],
  );
  const addExercise = useCallback(
    (e: Omit<ExerciseEntry, 'id'>) => persist({ ...stateRef.current, exercises: [{ ...e, id: uid() }, ...stateRef.current.exercises] }),
    [persist],
  );
  const addCustomFood = useCallback(
    (f: Omit<Food, 'id' | 'source'>): Food => {
      const food: Food = { ...f, id: `c_${uid()}`, source: 'custom' };
      persist({ ...stateRef.current, customFoods: [food, ...stateRef.current.customFoods] });
      return food;
    },
    [persist],
  );

  const recentFoods = useMemo(() => {
    const all = [...state.customFoods, ...FOODS];
    const map = new Map(all.map((f) => [f.id, f]));
    return state.recentFoodIds.map((id) => map.get(id)).filter(Boolean) as Food[];
  }, [state.recentFoodIds, state.customFoods]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      user: auth?.user || null,
      token: auth?.token || null,
      onboarded: !!state.onboarded,
      syncing,
      register,
      login,
      signInWithSession,
      logout,
      completeOnboarding,
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
    [ready, auth, state, syncing, register, login, signInWithSession, logout, completeOnboarding, getDay, totalsFor, loggedDayKeys, logFood, addItem, updateItem, removeItem, setWater, setGoals, setProfile, addWeight, addExercise, addCustomFood, recentFoods],
  );

  return <FoodlogContext.Provider value={value}>{children}</FoodlogContext.Provider>;
}

export function useFoodlog(): Ctx {
  const ctx = useContext(FoodlogContext);
  if (!ctx) throw new Error('useFoodlog must be used within FoodlogProvider');
  return ctx;
}
