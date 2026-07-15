// Small shared helpers: dates (local yyyy-MM-dd keys) + number formatting.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function friendlyDate(key: string): string {
  const d = parseKey(key);
  const t = todayKey();
  const y = dateKey(addDays(new Date(), -1));
  if (key === t) return 'Today';
  if (key === y) return 'Yesterday';
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function longDate(key: string): string {
  const d = parseKey(key);
  const t = todayKey();
  const y = dateKey(addDays(new Date(), -1));
  const prefix = key === t ? 'Today' : key === y ? 'Yesterday' : DAYS_FULL[d.getDay()];
  return `${prefix} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function shortDate(key: string): string {
  const d = parseKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function num(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function round1(v: number): string {
  return v === Math.floor(v) ? String(v) : v.toFixed(1);
}

export function initials(name?: string): string {
  if (!name || !name.trim()) return 'FL';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
