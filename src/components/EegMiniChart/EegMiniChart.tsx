/**
 * EegMiniChart
 * Small line chart to visually represent EEG activity over time.
 * Rendered via react-native-svg (full-width, no axis gutter).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { colors, spacing } from '../../theme';

const { width } = Dimensions.get('window');
const POINTS = 96;

interface EegMiniChartProps {
  height?: number;
  /** Arabic word (or any id) to change waveform style. */
  activityKey?: string;
  /** 0..1, used to modulate amplitude/energy. */
  intensity?: number;
  /** When false, freeze animation. */
  running?: boolean;
}

const hashString = (input: string): number => {
  // Simple deterministic hash for UI purposes
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const generateEegWave = (phaseOffset: number, styleSeed: number, intensity01: number) => {
  const values: number[] = [];
  const e = clamp01(intensity01);
  const ampScale = 0.55 + e * 1.25;

  // Map seed -> subtle frequency/shape changes (demo-only)
  const seedA = ((styleSeed % 97) / 97) * 0.9 + 0.55;   // 0.55..1.45
  const seedB = (((styleSeed >> 8) % 89) / 89) * 0.9 + 0.55;
  const seedC = (((styleSeed >> 16) % 83) / 83) * 0.9 + 0.55;
  const seedD = (((styleSeed >> 24) % 79) / 79) * 0.9 + 0.55;

  // Band weights (keep EEG-ish)
  const wDelta = 6.5 * (0.8 + 0.4 * seedA);
  const wTheta = 5.5 * (0.8 + 0.4 * seedB);
  const wAlpha = 8.0 * (0.8 + 0.4 * seedC);
  const wBeta = 3.5 * (0.8 + 0.4 * seedD);

  for (let i = 0; i < POINTS; i += 1) {
    const t = i / POINTS; // 0–1 "seconds"
    // Combine a few bands to mimic EEG morphology (delta / theta / alpha / beta)
    const delta = wDelta * Math.sin(2 * Math.PI * ((2.0 * seedA) * t + phaseOffset)); // ~2 Hz
    const theta = wTheta * Math.sin(2 * Math.PI * ((6.0 * seedB) * t + phaseOffset)); // ~6 Hz
    const alpha = wAlpha * Math.sin(2 * Math.PI * ((10.0 * seedC) * t + phaseOffset)); // ~10 Hz
    const beta = wBeta * Math.sin(2 * Math.PI * ((20.0 * seedD) * t + phaseOffset)); // ~20 Hz

    // Small "noise" component driven by intensity to feel more alive
    const noise = (e * 2.2) * Math.sin(2 * Math.PI * (37 * t + phaseOffset * 0.35));

    const value = 50 + ampScale * (delta + theta + alpha + beta + noise); // baseline + combined bands
    values.push(value);
  }
  return values;
};

export const EegMiniChart: React.FC<EegMiniChartProps> = ({
  height = 180,
  activityKey = '—',
  intensity = 0,
  running = true,
}) => {
  const [chartWidth, setChartWidth] = useState(Math.max(width * 0.55, 260));
  const [phase, setPhase] = useState(0);

  const styleSeed = useMemo(() => hashString(activityKey || '—'), [activityKey]);
  const intensity01 = clamp01(intensity);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setPhase(p => (p + 0.04) % 1), 120);
    return () => clearInterval(t);
  }, [running]);

  const ch1 = useMemo(
    () => generateEegWave(phase, styleSeed, intensity01),
    [phase, styleSeed, intensity01]
  );
  const ch2 = useMemo(
    () => generateEegWave(phase + 0.22, styleSeed ^ 0x9e3779b9, intensity01 * 0.85),
    [phase, styleSeed, intensity01]
  );

  const pathFor = (vals: number[], pad: number) => {
    const w = Math.max(1, chartWidth);
    const h = Math.max(1, height);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = Math.max(1e-6, max - min);
    const innerW = Math.max(1, w - pad * 2);
    const innerH = Math.max(1, h - pad * 2);

    let d = '';
    for (let i = 0; i < vals.length; i += 1) {
      const x = pad + (i / (vals.length - 1)) * innerW;
      const norm = (vals[i] - min) / range;
      const y = pad + (1 - norm) * innerH;
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    return d.trim();
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const layoutWidth = event.nativeEvent.layout.width;
    if (layoutWidth > 0 && layoutWidth !== chartWidth) {
      setChartWidth(layoutWidth);
    }
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Svg width={chartWidth} height={height} style={styles.chart}>
        {/* subtle grid */}
        <Line x1="0" y1={height * 0.25} x2={chartWidth} y2={height * 0.25} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <Line x1="0" y1={height * 0.5} x2={chartWidth} y2={height * 0.5} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <Line x1="0" y1={height * 0.75} x2={chartWidth} y2={height * 0.75} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        <Path d={pathFor(ch2, 6)} stroke="rgba(180,230,210,0.9)" strokeWidth={1.4} fill="none" />
        <Path d={pathFor(ch1, 6)} stroke="rgba(255,255,255,0.95)" strokeWidth={1.8} fill="none" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: 16,
  },
});




