// Built-in food database — 100+ staples people actually eat, with per-serving
// nutrition. This is the offline core of Foodlog; global product lookup
// (OpenFoodFacts) layers on top of it. Values are approximate, per the stated
// serving. Fields: [name, category, serving, grams, kcal, P, C, F, fiber, sugar, sodium(mg)]

import { Food } from './types';

type Row = [string, string, string, number, number, number, number, number, number, number?, number?];

const RAW: Row[] = [
  // ── Fruits ──────────────────────────────────────────────────────────────
  ['Apple', 'Fruit', '1 medium (182 g)', 182, 95, 0.5, 25, 0.3, 4.4, 19, 2],
  ['Banana', 'Fruit', '1 medium (118 g)', 118, 105, 1.3, 27, 0.4, 3.1, 14, 1],
  ['Orange', 'Fruit', '1 medium (131 g)', 131, 62, 1.2, 15, 0.2, 3.1, 12, 0],
  ['Strawberries', 'Fruit', '1 cup (152 g)', 152, 49, 1, 12, 0.5, 3, 7, 2],
  ['Blueberries', 'Fruit', '1 cup (148 g)', 148, 84, 1.1, 21, 0.5, 3.6, 15, 1],
  ['Grapes', 'Fruit', '1 cup (151 g)', 151, 104, 1.1, 27, 0.2, 1.4, 23, 3],
  ['Watermelon', 'Fruit', '1 cup diced (152 g)', 152, 46, 0.9, 12, 0.2, 0.6, 9, 2],
  ['Mango', 'Fruit', '1 cup (165 g)', 165, 99, 1.4, 25, 0.6, 2.6, 23, 2],
  ['Pineapple', 'Fruit', '1 cup chunks (165 g)', 165, 82, 0.9, 22, 0.2, 2.3, 16, 2],
  ['Avocado', 'Fruit', '1/2 fruit (100 g)', 100, 160, 2, 9, 15, 7, 0.7, 7],
  ['Pear', 'Fruit', '1 medium (178 g)', 178, 101, 0.6, 27, 0.2, 5.5, 17, 2],
  ['Peach', 'Fruit', '1 medium (150 g)', 150, 59, 1.4, 14, 0.4, 2.3, 13, 0],
  ['Kiwi', 'Fruit', '1 fruit (69 g)', 69, 42, 0.8, 10, 0.4, 2.1, 6, 2],

  // ── Vegetables ──────────────────────────────────────────────────────────
  ['Broccoli', 'Vegetable', '1 cup chopped (91 g)', 91, 31, 2.5, 6, 0.3, 2.4, 1.5, 30],
  ['Spinach', 'Vegetable', '1 cup raw (30 g)', 30, 7, 0.9, 1.1, 0.1, 0.7, 0.1, 24],
  ['Carrots', 'Vegetable', '1 cup chopped (128 g)', 128, 52, 1.2, 12, 0.3, 3.6, 6, 88],
  ['Sweet potato', 'Vegetable', '1 medium (130 g)', 130, 112, 2, 26, 0.1, 3.9, 5, 72],
  ['Potato (baked)', 'Vegetable', '1 medium (173 g)', 173, 161, 4.3, 37, 0.2, 3.8, 2, 17],
  ['Tomato', 'Vegetable', '1 medium (123 g)', 123, 22, 1.1, 4.8, 0.2, 1.5, 3.2, 6],
  ['Cucumber', 'Vegetable', '1 cup sliced (119 g)', 119, 16, 0.8, 3.8, 0.2, 0.6, 1.7, 2],
  ['Bell pepper', 'Vegetable', '1 medium (119 g)', 119, 37, 1.2, 7, 0.4, 2.5, 5, 5],
  ['Corn', 'Vegetable', '1 ear (90 g)', 90, 88, 3.3, 19, 1.4, 2, 6.4, 15],
  ['Green beans', 'Vegetable', '1 cup (100 g)', 100, 31, 1.8, 7, 0.2, 2.7, 3.3, 6],
  ['Kale', 'Vegetable', '1 cup (67 g)', 67, 33, 2.9, 6, 0.6, 1.3, 1.6, 25],
  ['Mushrooms', 'Vegetable', '1 cup sliced (70 g)', 70, 15, 2.2, 2.3, 0.2, 0.7, 1.4, 4],
  ['Onion', 'Vegetable', '1 medium (110 g)', 110, 44, 1.2, 10, 0.1, 1.9, 5, 4],
  ['Mixed salad greens', 'Vegetable', '2 cups (72 g)', 72, 15, 1.3, 2.9, 0.2, 1.8, 1.2, 20],

  // ── Grains & Starches ────────────────────────────────────────────────────
  ['Oatmeal (cooked)', 'Grains', '1 cup (234 g)', 234, 154, 6, 27, 3.2, 4, 0.6, 9],
  ['White rice (cooked)', 'Grains', '1 cup (158 g)', 158, 205, 4.3, 45, 0.4, 0.6, 0, 2],
  ['Brown rice (cooked)', 'Grains', '1 cup (195 g)', 195, 216, 5, 45, 1.8, 3.5, 0.7, 10],
  ['Quinoa (cooked)', 'Grains', '1 cup (185 g)', 185, 222, 8, 39, 3.6, 5, 1.6, 13],
  ['Whole wheat bread', 'Grains', '1 slice (32 g)', 32, 81, 4, 14, 1.1, 1.9, 1.4, 144],
  ['White bread', 'Grains', '1 slice (25 g)', 25, 66, 1.9, 13, 0.8, 0.6, 1.4, 127],
  ['Bagel (plain)', 'Grains', '1 medium (98 g)', 98, 245, 10, 48, 1.5, 2, 5, 430],
  ['Pasta (cooked)', 'Grains', '1 cup (140 g)', 140, 220, 8, 43, 1.3, 2.5, 0.8, 1],
  ['Tortilla (flour)', 'Grains', '1 medium (49 g)', 49, 146, 4, 24, 4, 1.5, 1, 364],
  ['Cornflakes', 'Grains', '1 cup (28 g)', 28, 100, 2, 24, 0, 1, 3, 200],
  ['Granola', 'Grains', '1/2 cup (61 g)', 61, 280, 7, 38, 12, 5, 12, 40],
  ['Pancakes', 'Grains', '2 pancakes (77 g)', 77, 175, 5, 22, 7, 1, 4, 385],

  // ── Protein: meat, poultry, fish, eggs ───────────────────────────────────
  ['Chicken breast (grilled)', 'Protein', '100 g', 100, 165, 31, 0, 3.6, 0, 0, 74],
  ['Chicken thigh (roasted)', 'Protein', '100 g', 100, 209, 26, 0, 11, 0, 0, 88],
  ['Ground beef (85% lean)', 'Protein', '100 g', 100, 250, 26, 0, 15, 0, 0, 75],
  ['Steak (sirloin)', 'Protein', '100 g', 100, 206, 27, 0, 10, 0, 0, 55],
  ['Pork chop', 'Protein', '100 g', 100, 231, 26, 0, 14, 0, 0, 62],
  ['Bacon', 'Protein', '2 slices (16 g)', 16, 86, 6, 0.2, 7, 0, 0, 386],
  ['Salmon (baked)', 'Protein', '100 g', 100, 208, 20, 0, 13, 0, 0, 59],
  ['Tuna (canned in water)', 'Protein', '100 g', 100, 116, 26, 0, 0.8, 0, 0, 247],
  ['Shrimp (cooked)', 'Protein', '100 g', 100, 99, 24, 0.2, 0.3, 0, 0, 111],
  ['Cod (baked)', 'Protein', '100 g', 100, 105, 23, 0, 0.9, 0, 0, 78],
  ['Egg (large)', 'Protein', '1 egg (50 g)', 50, 72, 6.3, 0.4, 4.8, 0, 0.2, 71],
  ['Egg whites', 'Protein', '1 cup (243 g)', 243, 126, 26, 1.8, 0.4, 0, 1.8, 403],
  ['Turkey breast (deli)', 'Protein', '2 oz (57 g)', 57, 54, 11, 1.5, 0.5, 0, 1, 578],
  ['Tofu (firm)', 'Protein', '100 g', 100, 144, 17, 3, 9, 2, 0.6, 14],
  ['Tempeh', 'Protein', '100 g', 100, 192, 20, 8, 11, 0, 0, 9],

  // ── Dairy & alternatives ──────────────────────────────────────────────────
  ['Whole milk', 'Dairy', '1 cup (244 g)', 244, 149, 8, 12, 8, 0, 12, 105],
  ['Skim milk', 'Dairy', '1 cup (245 g)', 245, 83, 8, 12, 0.2, 0, 12, 103],
  ['Greek yogurt (plain)', 'Dairy', '1 cup (245 g)', 245, 146, 25, 9, 4, 0, 9, 88],
  ['Yogurt (low-fat)', 'Dairy', '1 cup (245 g)', 245, 154, 13, 17, 4, 0, 17, 172],
  ['Cheddar cheese', 'Dairy', '1 oz (28 g)', 28, 115, 7, 0.4, 9, 0, 0.1, 185],
  ['Mozzarella', 'Dairy', '1 oz (28 g)', 28, 85, 6, 0.6, 6, 0, 0.3, 178],
  ['Cottage cheese', 'Dairy', '1/2 cup (113 g)', 113, 92, 12, 5, 2.6, 0, 4, 348],
  ['Butter', 'Dairy', '1 tbsp (14 g)', 14, 102, 0.1, 0, 12, 0, 0, 91],
  ['Almond milk (unsweetened)', 'Dairy', '1 cup (240 g)', 240, 39, 1, 3.4, 2.9, 0.5, 2, 186],
  ['Oat milk', 'Dairy', '1 cup (240 g)', 240, 120, 3, 16, 5, 2, 7, 100],
  ['Cream cheese', 'Dairy', '1 tbsp (14 g)', 14, 51, 0.9, 0.8, 5, 0, 0.5, 46],

  // ── Legumes, nuts & seeds ────────────────────────────────────────────────
  ['Black beans (cooked)', 'Legumes', '1/2 cup (86 g)', 86, 114, 7.6, 20, 0.5, 7.5, 0.3, 1],
  ['Chickpeas (cooked)', 'Legumes', '1/2 cup (82 g)', 82, 134, 7.3, 22, 2.1, 6.2, 4, 5],
  ['Lentils (cooked)', 'Legumes', '1/2 cup (99 g)', 99, 115, 9, 20, 0.4, 7.8, 1.8, 2],
  ['Kidney beans (cooked)', 'Legumes', '1/2 cup (89 g)', 89, 112, 7.7, 20, 0.4, 5.7, 0.3, 1],
  ['Edamame', 'Legumes', '1/2 cup (78 g)', 78, 94, 9, 7, 4, 4, 1.5, 5],
  ['Almonds', 'Nuts', '1 oz (28 g)', 28, 164, 6, 6, 14, 3.5, 1.2, 0],
  ['Peanut butter', 'Nuts', '2 tbsp (32 g)', 32, 188, 8, 6, 16, 1.9, 3, 152],
  ['Walnuts', 'Nuts', '1 oz (28 g)', 28, 185, 4.3, 3.9, 18, 1.9, 0.7, 1],
  ['Cashews', 'Nuts', '1 oz (28 g)', 28, 157, 5.2, 9, 12, 0.9, 1.7, 3],
  ['Peanuts', 'Nuts', '1 oz (28 g)', 28, 161, 7.3, 4.6, 14, 2.4, 1.3, 5],
  ['Chia seeds', 'Nuts', '1 tbsp (12 g)', 12, 58, 2, 5, 3.7, 4.1, 0, 2],
  ['Sunflower seeds', 'Nuts', '1 oz (28 g)', 28, 165, 5.5, 6.8, 14, 3, 0.8, 1],

  // ── Beverages ──────────────────────────────────────────────────────────
  ['Coffee (black)', 'Beverage', '1 cup (240 g)', 240, 2, 0.3, 0, 0, 0, 0, 5],
  ['Latte (whole milk)', 'Beverage', '12 oz (355 g)', 355, 180, 10, 15, 9, 0, 14, 115],
  ['Orange juice', 'Beverage', '1 cup (248 g)', 248, 112, 1.7, 26, 0.5, 0.5, 21, 2],
  ['Cola', 'Beverage', '1 can (355 ml)', 355, 140, 0, 39, 0, 0, 39, 45],
  ['Beer', 'Beverage', '1 can (355 ml)', 355, 153, 1.6, 13, 0, 0, 0, 14],
  ['Red wine', 'Beverage', '5 oz (147 ml)', 147, 125, 0.1, 4, 0, 0, 0.9, 6],
  ['Green tea (unsweetened)', 'Beverage', '1 cup (240 g)', 240, 2, 0.5, 0, 0, 0, 0, 2],
  ['Protein shake (whey)', 'Beverage', '1 scoop + water (330 g)', 330, 130, 25, 4, 1.5, 1, 2, 130],
  ['Sports drink', 'Beverage', '20 oz (591 ml)', 591, 140, 0, 36, 0, 0, 34, 270],

  // ── Snacks & sweets ──────────────────────────────────────────────────────
  ['Potato chips', 'Snacks', '1 oz (28 g)', 28, 152, 2, 15, 10, 1.3, 0.2, 149],
  ['Dark chocolate', 'Snacks', '1 oz (28 g)', 28, 170, 2, 13, 12, 3, 7, 6],
  ['Milk chocolate bar', 'Snacks', '1 bar (43 g)', 43, 235, 3, 26, 13, 1.5, 23, 35],
  ['Popcorn (air-popped)', 'Snacks', '3 cups (24 g)', 24, 93, 3, 19, 1.1, 3.6, 0.2, 2],
  ['Pretzels', 'Snacks', '1 oz (28 g)', 28, 108, 3, 22, 0.8, 0.9, 0.6, 385],
  ['Granola bar', 'Snacks', '1 bar (35 g)', 35, 150, 3, 24, 5, 2, 11, 80],
  ['Ice cream (vanilla)', 'Snacks', '1/2 cup (66 g)', 66, 137, 2.3, 16, 7, 0.5, 14, 53],
  ['Cookie (chocolate chip)', 'Snacks', '1 cookie (30 g)', 30, 148, 1.7, 20, 7, 0.7, 12, 96],
  ['Donut (glazed)', 'Snacks', '1 donut (60 g)', 60, 240, 4, 26, 14, 0.7, 12, 210],
  ['Trail mix', 'Snacks', '1/4 cup (37 g)', 37, 175, 5, 16, 11, 2.5, 10, 55],
  ['Hummus', 'Snacks', '2 tbsp (30 g)', 30, 70, 2, 4, 5, 1.5, 0, 130],

  // ── Prepared meals & fast food ───────────────────────────────────────────
  ['Cheeseburger', 'Fast food', '1 sandwich (232 g)', 232, 535, 30, 39, 28, 2, 8, 1100],
  ['Pizza (cheese)', 'Fast food', '1 slice (107 g)', 107, 285, 12, 36, 10, 2.5, 4, 640],
  ['French fries', 'Fast food', 'medium (117 g)', 117, 365, 4, 48, 17, 4, 0.3, 246],
  ['Chicken nuggets', 'Fast food', '6 pieces (96 g)', 96, 270, 14, 16, 17, 1, 0, 540],
  ['Caesar salad (w/ chicken)', 'Meals', '1 bowl (250 g)', 250, 340, 28, 12, 20, 3, 4, 720],
  ['Turkey sandwich', 'Meals', '1 sandwich (200 g)', 200, 320, 20, 40, 9, 4, 6, 900],
  ['Burrito (bean & rice)', 'Meals', '1 burrito (250 g)', 250, 445, 15, 65, 14, 9, 3, 980],
  ['Sushi roll (California)', 'Meals', '6 pieces (170 g)', 170, 255, 9, 38, 7, 4, 8, 450],
  ['Ramen (instant)', 'Meals', '1 package (85 g)', 85, 380, 8, 52, 14, 2, 2, 1600],
  ['Mac & cheese', 'Meals', '1 cup (200 g)', 200, 376, 13, 47, 15, 2, 7, 730],
  ['Scrambled eggs (2)', 'Meals', '2 eggs (122 g)', 122, 182, 12, 2, 14, 0, 1.5, 340],
  ['Oatmeal w/ berries', 'Meals', '1 bowl (280 g)', 280, 250, 8, 45, 5, 7, 12, 10],
  ['Grilled chicken salad', 'Meals', '1 bowl (300 g)', 300, 330, 32, 14, 16, 5, 7, 560],
  ['Stir-fry (veg & tofu)', 'Meals', '1 plate (350 g)', 350, 380, 18, 42, 16, 8, 10, 850],

  // ── Condiments & extras ──────────────────────────────────────────────────
  ['Olive oil', 'Condiment', '1 tbsp (14 g)', 14, 119, 0, 0, 14, 0, 0, 0],
  ['Ketchup', 'Condiment', '1 tbsp (17 g)', 17, 17, 0.2, 4.5, 0, 0, 3.7, 154],
  ['Mayonnaise', 'Condiment', '1 tbsp (14 g)', 14, 94, 0.1, 0.1, 10, 0, 0.1, 88],
  ['Honey', 'Condiment', '1 tbsp (21 g)', 21, 64, 0.1, 17, 0, 0, 17, 1],
  ['Maple syrup', 'Condiment', '1 tbsp (20 g)', 20, 52, 0, 13, 0, 0, 12, 2],
  ['Ranch dressing', 'Condiment', '2 tbsp (30 g)', 30, 129, 0.4, 1.8, 13, 0, 1.5, 270],
  ['Soy sauce', 'Condiment', '1 tbsp (16 g)', 16, 8, 1.3, 0.8, 0, 0.1, 0.1, 878],
  ['Salsa', 'Condiment', '2 tbsp (30 g)', 30, 10, 0.5, 2, 0, 0.5, 1, 200],
];

export const FOODS: Food[] = RAW.map((r, i) => {
  const [name, category, serving, grams, calories, protein, carbs, fat, fiber, sugar, sodium] = r;
  return {
    id: `b${i + 1}`,
    name,
    category,
    serving,
    grams,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    source: 'builtin' as const,
  };
});

export const FOOD_CATEGORIES: string[] = Array.from(new Set(FOODS.map((f) => f.category)));

export function searchLocal(query: string, extra: Food[] = []): Food[] {
  const all = [...extra, ...FOODS];
  const q = query.trim().toLowerCase();
  if (!q) return all;
  const starts: Food[] = [];
  const contains: Food[] = [];
  for (const f of all) {
    const n = f.name.toLowerCase();
    if (n.startsWith(q)) starts.push(f);
    else if (n.includes(q) || f.category.toLowerCase().includes(q) || (f.brand?.toLowerCase().includes(q) ?? false))
      contains.push(f);
  }
  return [...starts, ...contains];
}
