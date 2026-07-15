import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line as SvgLine,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { C, font } from '@/theme';
import { Txt } from '@/ui';

/* ── Bar chart (vertical) ─────────────────────────────────────────────── */
export function BarChart({
  data,
  height = 160,
  color = C.brand,
  showValues = true,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showValues?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = height - 34;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 8 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * barH);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {showValues && (
              <Txt f={font.monoBold} size={11} color={C.ink} style={{ marginBottom: 4 }}>
                {d.value}
              </Txt>
            )}
            <View
              style={{
                width: '78%',
                height: h,
                backgroundColor: color,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              }}
            />
            <Txt f={font.body} size={10} color={C.muted} style={{ marginTop: 6 }} numberOfLines={1}>
              {d.label}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

/* ── Line / area chart ────────────────────────────────────────────────── */
export function LineChart({
  data,
  width,
  height = 180,
  color = C.brand,
  area = true,
  labels,
}: {
  data: number[];
  width: number;
  height?: number;
  color?: string;
  area?: boolean;
  labels?: string[];
}) {
  const pad = 24;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + h - ((v - min) / range) * h;
    return { x, y };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${line} L${pts[pts.length - 1].x},${pad + h} L${pts[0].x},${pad + h} Z`;
  return (
    <Svg width={width} height={height}>
      {[0, 0.5, 1].map((g, i) => (
        <SvgLine key={i} x1={pad} y1={pad + h * g} x2={pad + w} y2={pad + h * g} stroke={C.line} strokeWidth={1} />
      ))}
      {area && <Path d={areaPath} fill={color} opacity={0.14} />}
      <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={C.card} stroke={color} strokeWidth={2} />
      ))}
      {labels &&
        labels.map((l, i) => (
          <SvgText
            key={i}
            x={pad + i * stepX}
            y={height - 4}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
            fontFamily={font.body}>
            {l}
          </SvgText>
        ))}
    </Svg>
  );
}

/* ── Donut / pie ──────────────────────────────────────────────────────── */
export function Donut({
  segments,
  size = 150,
  thickness = 22,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {segments.map((s, i) => {
            const len = (s.value / total) * circ;
            const el = (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke={s.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      {(centerLabel || centerSub) && (
        <View style={{ alignItems: 'center' }}>
          {centerLabel && (
            <Txt f={font.monoBold} size={20} color={C.ink}>
              {centerLabel}
            </Txt>
          )}
          {centerSub && (
            <Txt f={font.body} size={10} color={C.muted}>
              {centerSub}
            </Txt>
          )}
        </View>
      )}
    </View>
  );
}

/* ── Radar (skills) ───────────────────────────────────────────────────── */
export function Radar({
  data,
  size = 220,
  color = C.brand,
}: {
  data: { label: string; value: number }[]; // value 0..100
  size?: number;
  color?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, radiusScale: number) => {
    const a = angle(i);
    return { x: cx + Math.cos(a) * r * radiusScale, y: cy + Math.sin(a) * r * radiusScale };
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = data
    .map((d, i) => {
      const p = point(i, d.value / 100);
      return `${p.x},${p.y}`;
    })
    .join(' ');
  return (
    <Svg width={size} height={size}>
      {rings.map((ring, ri) => (
        <Polygon
          key={ri}
          points={data.map((_, i) => {
            const p = point(i, ring);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke={C.line}
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const p = point(i, 1);
        return <SvgLine key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={C.line} strokeWidth={1} />;
      })}
      <Polygon points={poly} fill={color} fillOpacity={0.24} stroke={color} strokeWidth={2} />
      {data.map((d, i) => {
        const p = point(i, 1.16);
        return (
          <SvgText
            key={i}
            x={p.x}
            y={p.y}
            fontSize={9}
            fill={C.muted}
            textAnchor="middle"
            fontFamily={font.bodySemi}>
            {d.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/* ── Progress bar ─────────────────────────────────────────────────────── */
export function ProgressBar({
  value,
  color = C.brand,
  track = C.line2,
  height = 8,
}: {
  value: number; // 0..100
  color?: string;
  track?: string;
  height?: number;
}) {
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/* ── Split bar (platform vs crew) ─────────────────────────────────────── */
export function CompareBar({
  home,
  away,
  homeColor = C.brand,
  awayColor = C.chart3,
}: {
  home: number;
  away: number;
  homeColor?: string;
  awayColor?: string;
}) {
  const total = home + away || 1;
  return (
    <View style={{ flexDirection: 'row', height: 10, borderRadius: 8, overflow: 'hidden' }}>
      <View style={{ flex: home / total, backgroundColor: homeColor }} />
      <View style={{ flex: away / total, backgroundColor: awayColor }} />
    </View>
  );
}
