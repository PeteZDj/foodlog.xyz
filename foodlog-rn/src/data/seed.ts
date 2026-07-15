// Demo profile + a rolling ~10 days of realistic history so History, Trends and
// the diary feel alive on first launch. Everything is editable and persists to
// AsyncStorage; sign-out clears it.

import { FOODS } from './foods';
import {
  DEFAULT_GOALS,
  ExerciseEntry,
  Food,
  FoodItem,
  FoodlogState,
  MealName,
  Profile,
  WeightEntry,
} from './types';
import { addDays, dateKey, uid } from '../util';

export const DEMO_USER = {
  name: 'Alex Rivera',
  email: 'alex@foodlog.xyz',
};

const byName = new Map(FOODS.map((f) => [f.name, f]));

function item(name: string, meal: MealName, servings = 1): FoodItem {
  const f = byName.get(name) as Food;
  return {
    id: uid(),
    name: f.name,
    serving: f.serving,
    meal,
    category: f.category,
    servings,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber,
    sugar: f.sugar,
    sodium: f.sodium,
  };
}

// Deterministic per-day templates (index 0 = 9 days ago … 9 = today).
const DAY_TEMPLATES: [string, MealName, number][][] = [
  [['Oatmeal w/ berries', 'Breakfast', 1], ['Grilled chicken salad', 'Lunch', 1], ['Salmon (baked)', 'Dinner', 1.5], ['Brown rice (cooked)', 'Dinner', 1], ['Almonds', 'Snacks', 1]],
  [['Greek yogurt (plain)', 'Breakfast', 1], ['Banana', 'Breakfast', 1], ['Turkey sandwich', 'Lunch', 1], ['Stir-fry (veg & tofu)', 'Dinner', 1], ['Dark chocolate', 'Snacks', 1]],
  [['Scrambled eggs (2)', 'Breakfast', 1], ['Whole wheat bread', 'Breakfast', 2], ['Burrito (bean & rice)', 'Lunch', 1], ['Chicken breast (grilled)', 'Dinner', 1.5], ['Sweet potato', 'Dinner', 1]],
  [['Latte (whole milk)', 'Breakfast', 1], ['Bagel (plain)', 'Breakfast', 1], ['Caesar salad (w/ chicken)', 'Lunch', 1], ['Pizza (cheese)', 'Dinner', 2], ['Ice cream (vanilla)', 'Snacks', 1]],
  [['Oatmeal (cooked)', 'Breakfast', 1], ['Peanut butter', 'Breakfast', 1], ['Sushi roll (California)', 'Lunch', 1.5], ['Steak (sirloin)', 'Dinner', 1.5], ['Broccoli', 'Dinner', 1]],
  [['Greek yogurt (plain)', 'Breakfast', 1], ['Granola', 'Breakfast', 1], ['Grilled chicken salad', 'Lunch', 1], ['Pasta (cooked)', 'Dinner', 1.5], ['Trail mix', 'Snacks', 1]],
  [['Protein shake (whey)', 'Breakfast', 1], ['Apple', 'Snacks', 1], ['Turkey sandwich', 'Lunch', 1], ['Salmon (baked)', 'Dinner', 1], ['Quinoa (cooked)', 'Dinner', 1]],
  [['Pancakes', 'Breakfast', 2], ['Maple syrup', 'Breakfast', 1], ['Cheeseburger', 'Lunch', 1], ['French fries', 'Lunch', 1], ['Grilled chicken salad', 'Dinner', 1]],
  [['Scrambled eggs (2)', 'Breakfast', 1], ['Avocado', 'Breakfast', 1], ['Chickpeas (cooked)', 'Lunch', 2], ['Chicken breast (grilled)', 'Dinner', 1.5], ['Green beans', 'Dinner', 1]],
  // today — partially logged
  [['Oatmeal w/ berries', 'Breakfast', 1], ['Coffee (black)', 'Breakfast', 1], ['Grilled chicken salad', 'Lunch', 1]],
];

const WATER_BY_DAY = [7, 8, 6, 5, 8, 7, 8, 4, 6, 3];

export function seedState(): FoodlogState {
  const entries: FoodlogState['entries'] = {};
  const today = new Date();
  DAY_TEMPLATES.forEach((tmpl, idx) => {
    const d = addDays(today, idx - (DAY_TEMPLATES.length - 1));
    const key = dateKey(d);
    entries[key] = {
      water: WATER_BY_DAY[idx] ?? 5,
      items: tmpl.map(([name, meal, servings]) => item(name, meal, servings)),
    };
  });

  const profile: Profile = {
    displayName: DEMO_USER.name,
    email: DEMO_USER.email,
    favoriteFood: 'Salmon poke bowl',
    location: 'Austin, TX',
    foodPhilosophy: 'Whole foods first, protein at every meal',
    currentWeight: 74.2,
    goalWeight: 70,
    height: 178,
    activityLevel: 'Moderately active',
    primaryGoal: 'Lose weight',
    exerciseGoal: 150,
    weightUnit: 'kg',
  };

  const weights: WeightEntry[] = [76.1, 75.6, 75.2, 74.9, 74.5, 74.2].map((w, i) => ({
    date: dateKey(addDays(today, (i - 5) * 5)),
    weight: w,
  }));

  const exercises: ExerciseEntry[] = [
    { id: uid(), date: dateKey(addDays(today, -1)), type: 'Running', minutes: 35, calories: 380 },
    { id: uid(), date: dateKey(addDays(today, -3)), type: 'Strength training', minutes: 50, calories: 260 },
    { id: uid(), date: dateKey(today), type: 'Walking', minutes: 25, calories: 110 },
  ];

  return {
    goals: { ...DEFAULT_GOALS, calories: 2100 },
    profile,
    entries,
    weights,
    exercises,
    customFoods: [],
    recentFoodIds: [],
  };
}
