// Foodlog shared building blocks — the editorial monochrome look: the 3-bar
// wordmark, the ink page header, hairline meters/pills, and a calorie ring.

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, font, radius } from '@/theme';
import { Txt } from '@/ui';

/* ── Wordmark: three descending bars, from the web nav ─────────────────── */
export function Mark({ size = 16, color = C.white, gap = 2 }: { size?: number; color?: string; gap?: number }) {
  const w = size * 0.34;
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-end', height: size }}>
      <View style={{ width: w, height: size, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ width: w, height: size, backgroundColor: color, borderRadius: 2, opacity: 0.6 }} />
      <View style={{ width: w, height: size, backgroundColor: color, borderRadius: 2, opacity: 0.3 }} />
    </View>
  );
}

export function Wordmark({ color = C.white, size = 20 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Mark size={size * 0.85} color={color} />
      <Txt f={font.black} size={size} color={color} style={{ letterSpacing: -0.5 }}>
        foodlog
      </Txt>
    </View>
  );
}

/* ── Ink page header (Today / History / Foods / Account) ───────────────── */
export function Header({
  title,
  subtitle,
  children,
  compact,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: C.ink,
        paddingHorizontal: 20,
        paddingTop: compact ? 14 : 18,
        paddingBottom: compact ? 14 : 18,
      }}>
      {title != null && (
        <Txt f={font.black} size={26} color={C.white} style={{ letterSpacing: -0.6 }}>
          {title}
        </Txt>
      )}
      {subtitle != null && (
        <Txt f={font.body} size={13} color="#B9B9B4" style={{ marginTop: 2 }}>
          {subtitle}
        </Txt>
      )}
      {children}
    </View>
  );
}

/* ── Detail header with a back button ──────────────────────────────────── */
export function DetailHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: C.ink,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={10}
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chevron-back" size={24} color={C.white} />
      </Pressable>
      <Txt f={font.bold} size={18} color={C.white} style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

/* ── Thin meter (value / goal) ─────────────────────────────────────────── */
export function Meter({ fraction, fill = C.ink, height = 8 }: { fraction: number; fill?: string; height?: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <View style={{ height, backgroundColor: C.line2, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${f * 100}%`, height, backgroundColor: fill, borderRadius: height / 2 }} />
    </View>
  );
}

/* ── Status pill ───────────────────────────────────────────────────────── */
export function Pill({ label, bg = C.bgElevated, fg = C.muted, style }: { label: string; bg?: string; fg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }, style]}>
      <Txt f={font.bodyBold} size={11} color={fg} style={{ letterSpacing: 0.2 }}>
        {label}
      </Txt>
    </View>
  );
}

/* ── Small stat column ─────────────────────────────────────────────────── */
export function StatCol({ value, label, align = 'flex-start' }: { value: string; label: string; align?: 'flex-start' | 'center' }) {
  return (
    <View style={{ flex: 1, alignItems: align }}>
      <Txt f={font.bold} size={16} color={C.ink}>
        {value}
      </Txt>
      <Txt f={font.body} size={11} color={C.muted} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

/* ── Macro row (name + value/goal + meter) ─────────────────────────────── */
export function MacroRow({ name, value, goal, unit = 'g', fill }: { name: string; value: number; goal: number; unit?: string; fill: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Txt f={font.bodyMed} size={13} color={C.textSub}>
          {name}
        </Txt>
        <Txt f={font.bodyBold} size={13} color={C.ink}>
          {Math.round(value)} / {Math.round(goal)} {unit}
        </Txt>
      </View>
      <Meter fraction={goal > 0 ? value / goal : 0} fill={fill} />
    </View>
  );
}

/* ── Calorie ring (SVG donut with remaining in the center) ─────────────── */
export function CalorieRing({
  value,
  goal,
  size = 132,
  thickness = 12,
  fill = C.ink,
}: {
  value: number;
  goal: number;
  size?: number;
  thickness?: number;
  fill?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const frac = goal > 0 ? Math.min(1, value / goal) : 0;
  const remaining = Math.max(0, Math.round(goal - value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line2} strokeWidth={thickness} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fill}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Txt f={font.black} size={30} color={C.ink} style={{ letterSpacing: -1 }}>
        {remaining.toLocaleString('en-US')}
      </Txt>
      <Txt f={font.mono} size={10} color={C.muted} style={{ letterSpacing: 0.5 }}>
        KCAL LEFT
      </Txt>
    </View>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */
export function EmptyState({ icon = 'restaurant-outline', title, sub }: { icon?: keyof typeof Ionicons.glyphMap; title: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
        <Ionicons name={icon} size={26} color={C.muted} />
      </View>
      <Txt f={font.bold} size={16} color={C.ink} align="center">
        {title}
      </Txt>
      {sub && (
        <Txt f={font.body} size={13} color={C.muted} align="center" lh={19} style={{ marginTop: 4, maxWidth: 260 }}>
          {sub}
        </Txt>
      )}
    </View>
  );
}

/* ── Section label (mono kicker) ───────────────────────────────────────── */
export function Kicker({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Txt f={font.mono} size={11} color={C.muted} style={[{ letterSpacing: 1.5 }, style as any]}>
      {children.toUpperCase()}
    </Txt>
  );
}
