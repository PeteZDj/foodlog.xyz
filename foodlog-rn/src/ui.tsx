import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { C, font, radius, shadow } from '@/theme';

/* ── Text ─────────────────────────────────────────────────────────────── */
export function Txt({
  f = font.body,
  size = 14,
  color = C.text,
  lh,
  align,
  style,
  ...rest
}: TextProps & {
  f?: string;
  size?: number;
  color?: string;
  lh?: number;
  align?: TextStyle['textAlign'];
}) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: f, fontSize: size, color, lineHeight: lh, textAlign: align },
        style,
      ]}
    />
  );
}

/* ── Card ─────────────────────────────────────────────────────────────── */
export function Card({
  style,
  pad = 16,
  children,
  ...rest
}: ViewProps & { pad?: number }) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: C.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: C.line,
          padding: pad,
        },
        shadow.card,
        style,
      ]}>
      {children}
    </View>
  );
}

/* ── Badge / Pill ─────────────────────────────────────────────────────── */
export function Badge({
  label,
  bg = C.brandMuted,
  color = C.brand,
  style,
  dot,
}: {
  label: string;
  bg?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  dot?: boolean;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
          gap: 5,
        },
        style,
      ]}>
      {dot && (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      )}
      <Txt f={font.bodyBold} size={11} color={color} style={{ letterSpacing: 0.3 }}>
        {label}
      </Txt>
    </View>
  );
}

/* ── Gradient button ──────────────────────────────────────────────────── */
export function GradientButton({
  title,
  onPress,
  colors = [C.brand, C.brandDark],
  icon,
  style,
  textColor = C.white,
  size = 'md',
}: {
  title: string;
  onPress?: () => void;
  colors?: string[];
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const h = size === 'lg' ? 56 : size === 'sm' ? 40 : 50;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}>
      <LinearGradient
        colors={colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            height: h,
            borderRadius: radius.pill,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 22,
          },
          shadow.brand,
        ]}>
        {icon && <Ionicons name={icon} size={size === 'lg' ? 20 : 17} color={textColor} />}
        <Txt f={font.bodyBold} size={size === 'lg' ? 16 : 14.5} color={textColor}>
          {title}
        </Txt>
      </LinearGradient>
    </Pressable>
  );
}

export function OutlineButton({
  title,
  onPress,
  color = C.ink,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 50,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: color === C.ink ? C.line : color,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 20,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}>
      {icon && <Ionicons name={icon} size={17} color={color} />}
      <Txt f={font.bodyBold} size={14.5} color={color}>
        {title}
      </Txt>
    </Pressable>
  );
}

/* ── Chip (selectable) ────────────────────────────────────────────────── */
export function Chip({
  label,
  active,
  onPress,
  activeColor = C.brand,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  activeColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: active ? activeColor : C.card,
        borderWidth: 1,
        borderColor: active ? activeColor : C.line,
        marginRight: 8,
        marginBottom: 8,
      }}>
      <Txt f={font.bodySemi} size={13} color={active ? C.white : C.textSub}>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ── Section header ───────────────────────────────────────────────────── */
export function SectionTitle({
  kicker,
  title,
  action,
  onAction,
  style,
}: {
  kicker?: string;
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
        style,
      ]}>
      <View style={{ flex: 1 }}>
        {kicker && (
          <Txt f={font.bodyBold} size={11} color={C.brand} style={{ letterSpacing: 1.5, marginBottom: 2 }}>
            {kicker.toUpperCase()}
          </Txt>
        )}
        <Txt f={font.bold} size={20} color={C.ink}>
          {title}
        </Txt>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt f={font.bodySemi} size={13} color={C.brand}>
            {action}
          </Txt>
          <Ionicons name="chevron-forward" size={15} color={C.brand} />
        </Pressable>
      )}
    </View>
  );
}

/* ── Stat block ───────────────────────────────────────────────────────── */
export function StatBlock({
  value,
  label,
  color = C.brand,
  align = 'center',
}: {
  value: string;
  label: string;
  color?: string;
  align?: 'center' | 'flex-start';
}) {
  return (
    <View style={{ alignItems: align, flex: 1 }}>
      <Txt f={font.monoBold} size={22} color={color}>
        {value}
      </Txt>
      <Txt f={font.body} size={11} color={C.muted} align={align === 'center' ? 'center' : 'left'}>
        {label}
      </Txt>
    </View>
  );
}

/* ── Avatar (initials or image) ───────────────────────────────────────── */
export function Avatar({
  name,
  size = 44,
  color = C.brand,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '33',
        borderWidth: 1,
        borderColor: color + '55',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Txt f={font.bold} size={size * 0.36} color={color === C.brand ? C.brandLight : color}>
        {initials}
      </Txt>
    </View>
  );
}

/* ── Divider ──────────────────────────────────────────────────────────── */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.line }, style]} />;
}

/* ── Row helper ───────────────────────────────────────────────────────── */
export function Row({ style, children, gap, ...rest }: ViewProps & { gap?: number }) {
  return (
    <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      {children}
    </View>
  );
}

/* ── Loading ──────────────────────────────────────────────────────────── */
export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator color={C.brand} size="large" />
    </View>
  );
}
