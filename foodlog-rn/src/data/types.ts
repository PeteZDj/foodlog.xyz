// Foodlog data model — mirrors the synced tracker state authored by the web app
// and consumed by Foodlog.App (see Foodlog.App/Models/Models.cs). The RN app is
// offline-first: this exact shape is persisted to AsyncStorage.

export type MealName = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

/** A food in the searchable catalog (built-in staple, custom, or OpenFoodFacts). */
export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: string;
  serving: string; // human label e.g. "1 cup (240 ml)"
  grams: number; // reference grams for one serving
  // Nutrition PER SINGLE SERVING (as displayed on serving label)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number; // mg
  satFat?: number;
  potassium?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
  vitaminC?: number; // mg
  source?: 'builtin' | 'custom' | 'off';
  barcode?: string;
}

/** A logged food. Nutrition fields are PER SINGLE SERVING; multiply by servings. */
export interface FoodItem {
  id: string; // local uid for edit/remove
  entryId?: string; // mirrors `id`; the web client keys/edits items by entryId
  name: string;
  serving: string;
  meal: MealName;
  category?: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  satFat?: number;
  photo?: string; // base64 data URL — synced to and shown on the website
  emoji?: string; // single emoji for AI-described / manual foods
  source?: string; // e.g. "AI photo scan", "Described", "Manual"
  note?: string;
  loggedAt?: string; // ISO time
}

export interface DayEntry {
  water: number; // glasses
  items: FoodItem[];
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number; // glasses
}

export interface Profile {
  displayName?: string;
  email?: string;
  photo?: string; // avatar (base64 or URL) — matches the website's profile.photo
  age?: number;
  gender?: string; // 'Female' | 'Male' | 'Other' | 'Prefer not to say'
  favoriteFood?: string;
  location?: string;
  foodPhilosophy?: string;
  bio?: string;
  currentWeight?: number;
  goalWeight?: number;
  height?: number; // cm
  activityLevel?: string;
  primaryGoal?: string;
  exerciseGoal?: number; // minutes / week
  weightUnit?: 'kg' | 'lb';
}

export interface WeightEntry {
  date: string; // yyyy-MM-dd
  weight: number;
  notes?: string;
}

export interface ExerciseEntry {
  id: string;
  date: string; // yyyy-MM-dd
  type: string;
  minutes: number;
  calories: number;
  notes?: string;
}

export interface FoodlogState {
  goals: Goals;
  profile: Profile;
  entries: Record<string, DayEntry>; // key: yyyy-MM-dd
  weights: WeightEntry[];
  exercises: ExerciseEntry[];
  customFoods: Food[];
  recentFoodIds: string[];
  onboarded?: boolean; // false until the new-user profile form is completed
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  items: number;
}

export function emptyTotals(): DayTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, items: 0 };
}

export function totalsOf(items: FoodItem[]): DayTotals {
  const t = emptyTotals();
  for (const it of items) {
    const s = it.servings || 1;
    t.calories += (it.calories || 0) * s;
    t.protein += (it.protein || 0) * s;
    t.carbs += (it.carbs || 0) * s;
    t.fat += (it.fat || 0) * s;
    t.fiber += (it.fiber || 0) * s;
    t.sugar += (it.sugar || 0) * s;
    t.sodium += (it.sodium || 0) * s;
    t.items += 1;
  }
  return t;
}

export const DEFAULT_GOALS: Goals = {
  calories: 2200,
  protein: 150,
  carbs: 240,
  fat: 70,
  fiber: 30,
  water: 8,
};
