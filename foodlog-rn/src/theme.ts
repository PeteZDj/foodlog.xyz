// Foodlog design system — ported from the web app + Foodlog.App (MAUI) client.
// A refined, editorial MONOCHROME light theme: "paper" canvas, near-black ink,
// white cards with hairline borders, grayscale macro bars. A single food-green
// brand accent (from the favicon gradient) adds life for logging + on-track cues.
//
// Fonts: Manrope (display + body), DM Mono (numbers / data / labels).

export const C = {
  // ── brand (food green, from favicon #37b063 → #0d5f2b) ──
  brand: '#2E9E5B',
  brandDark: '#17643A',
  brandLight: '#6FCB92',
  brandMuted: '#E4F1E9', // pale green tint for chips/badges
  brandTint: '#F1F8F3',
  accent: '#2E9E5B',

  // ── ink / neutrals (the monochrome core) ──
  ink: '#0A0A0A', // headers, primary buttons, protein bar
  inkSoft: '#202020',
  dark: '#0A0A0A',
  text: '#141413',
  textSub: '#3F3F3D',
  subInk: '#3F3F3D',
  muted: '#71716C',
  muted2: '#9A9A94',
  mutedLite: '#9A9A94',

  // ── surfaces ──
  bg: '#F5F5F2', // paper
  bgElevated: '#EFEFEA',
  tint: '#EFEFEA',
  card: '#FFFFFF',
  card2: '#FAFAF8',
  line: '#DDDDDA',
  line2: '#ECECE9', // meter / progress track

  white: '#FFFFFF',
  black: '#0A0A0A',

  // ── macro bars (grayscale, matching web + MAUI) ──
  protein: '#0A0A0A',
  carbs: '#3F3F3D',
  fat: '#696965',
  fiber: '#999993',

  // ── status / semantic ──
  success: '#1D6B42',
  successBg: '#E1F0E8',
  danger: '#A12828',
  dangerBg: '#F6E4E4',
  warn: '#8A5A1B',
  warnBg: '#F4EAD8',

  green: '#1D6B42',
  greenBg: '#E1F0E8',
  red: '#A12828',
  redBg: '#F6E4E4',
  water: '#2F6FB0',
  waterBg: '#E4EEF7',

  // charts (kept mostly grayscale for editorial consistency)
  chart1: '#0A0A0A',
  chart2: '#3F3F3D',
  chart3: '#696965',
  chart4: '#999993',
  chart5: '#2E9E5B',
} as const;

export const GRAD = {
  brand: ['#37B063', '#0D5F2B'] as [string, string],
  brandGlow: ['#6FCB92', '#2E9E5B'] as [string, string],
  ink: ['#202020', '#0A0A0A'] as [string, string],
  hero: ['#141413', '#0A0A0A'] as [string, string],
  green: ['#37B063', '#1D6B42'] as [string, string],
};

// Darken/lighten a hex color by amt in [-1, 1].
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  r = f(r); g = f(g); b = f(b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Translucent version of a hex (alpha 0-1) as #RRGGBBAA.
export function alpha(hex: string, a: number): string {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return `#${full}${aa}`;
}

export const font = {
  // display / headings — Manrope
  black: 'Manrope_800ExtraBold',
  extra: 'Manrope_800ExtraBold',
  bold: 'Manrope_700Bold',
  semi: 'Manrope_600SemiBold',
  head: 'Manrope_800ExtraBold',
  // body — Manrope
  body: 'Manrope_400Regular',
  bodyMed: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  // data / numbers / mono labels — DM Mono
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
  monoBold: 'DMMono_500Medium',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 18, xxl: 24, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#3F3F3D',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  soft: {
    shadowColor: '#3F3F3D',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  brand: {
    shadowColor: '#17643A',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;

/* ── Meal metadata ────────────────────────────────────────────────────── */
export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_ICON: Record<string, string> = {
  Breakfast: 'sunny-outline',
  Lunch: 'restaurant-outline',
  Dinner: 'moon-outline',
  Snacks: 'nutrition-outline',
};

/* ── Calorie status (mirrors TodayPage/HistoryPage logic) ─────────────── */
export function calorieStatus(total: number, goal: number): {
  label: string;
  bg: string;
  fg: string;
  fill: string;
} {
  const over = total > goal * 1.1;
  const onTrack = total >= goal * 0.75 && !over;
  if (over) return { label: 'Over target', bg: C.dangerBg, fg: C.danger, fill: C.danger };
  if (onTrack) return { label: 'On track', bg: C.successBg, fg: C.success, fill: C.success };
  return { label: 'In progress', bg: C.bgElevated, fg: C.muted, fill: C.ink };
}
