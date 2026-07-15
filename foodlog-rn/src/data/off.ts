// Global product lookup via OpenFoodFacts (free, no key). Layered on top of the
// built-in staples so "search millions of products" works when online. All
// calls time out fast and fail soft — the app stays fully usable offline.

import { Food } from './types';

const ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';
const FIELDS = 'code,product_name,brands,serving_size,serving_quantity,nutriments';

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function round(n: number, d = 1): number {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
}

function mapProduct(p: OffProduct): Food | null {
  const name = (p.product_name || '').trim();
  if (!name) return null;
  const n = p.nutriments || {};

  // Prefer per-serving values; fall back to per-100g.
  const servQty = num(p.serving_quantity);
  const hasServing = num(n['energy-kcal_serving']) > 0 || servQty > 0;
  const suffix = hasServing ? '_serving' : '_100g';

  const kcal = num(n[`energy-kcal${suffix}`]) || num(n['energy-kcal_100g']);
  if (kcal <= 0) return null;

  const grams = hasServing && servQty > 0 ? servQty : 100;
  const serving =
    hasServing && p.serving_size ? p.serving_size : hasServing ? `${round(grams)} g` : '100 g';

  const sodiumG = num(n[`sodium${suffix}`]) || num(n['salt_100g']) / 2.5;

  return {
    id: `off_${p.code || name}`,
    name,
    brand: (p.brands || '').split(',')[0]?.trim() || undefined,
    category: 'Product',
    serving,
    grams: round(grams),
    calories: round(kcal, 0),
    protein: round(num(n[`proteins${suffix}`])),
    carbs: round(num(n[`carbohydrates${suffix}`])),
    fat: round(num(n[`fat${suffix}`])),
    fiber: round(num(n[`fiber${suffix}`])),
    sugar: round(num(n[`sugars${suffix}`])),
    sodium: round(sodiumG * 1000, 0),
    satFat: round(num(n[`saturated-fat${suffix}`])),
    source: 'off',
    barcode: p.code,
  };
}

export async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<Food[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `${ENDPOINT}?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 7000);
  if (signal) signal.addEventListener('abort', () => ctrl.abort());

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'FoodlogApp/1.0 (foodlog.xyz)' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: OffProduct[] };
    const products = data.products || [];
    const mapped: Food[] = [];
    const seen = new Set<string>();
    for (const p of products) {
      const f = mapProduct(p);
      if (f && !seen.has(f.name.toLowerCase())) {
        seen.add(f.name.toLowerCase());
        mapped.push(f);
      }
    }
    return mapped;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
