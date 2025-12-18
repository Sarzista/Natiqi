/**
 * EegMiniChart
 * Small line chart to visually represent EEG activity over time.
 * Uses react-native-chart-kit + react-native-svg (already in project).
 */
import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing } from '../../theme';

const { width } = Dimensions.get('window');
const POINTS = 96;

interface EegMiniChartProps {
  height?: number;
}

const generateEegWave = (phaseOffset: number) => {
  const values: number[] = [];
  for (let i = 0; i < POINTS; i += 1) {
    const t = i / POINTS; // 0–1 "seconds"
    // Combine a few bands to mimic EEG morphology (delta / theta / alpha / beta)
    const delta = 8 * Math.sin(2 * Math.PI * (2 * t + phaseOffset)); // 2 Hz
    const theta = 6 * Math.sin(2 * Math.PI * (6 * t + phaseOffset)); // 6 Hz
    const alpha = 10 * Math.sin(2 * Math.PI * (10 * t + phaseOffset)); // 10 Hz
    const beta = 4 * Math.sin(2 * Math.PI * (20 * t + phaseOffset)); // 20 Hz

    const value = 50 + delta + theta + alpha + beta; // baseline + combined bands
    values.push(value);
  }
  return values;
};

export const EegMiniChart: React.FC<EegMiniChartProps> = ({ height = 180 }) => {
  const [chartWidth, setChartWidth] = useState(Math.max(width * 0.55, 260));

  // Mock EEG-like data: 2 continuous "channels"
  const data = {
    labels: Array.from({ length: POINTS }, () => ''),
    datasets: [
      {
        data: generateEegWave(0),
        color: () => 'rgba(255,255,255,0.95)',
        strokeWidth: 1.8,
      },
      {
        data: generateEegWave(0.22),
        color: () => 'rgba(180,230,210,0.9)',
        strokeWidth: 1.4,
      },
    ],
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const layoutWidth = event.nativeEvent.layout.width;
    if (layoutWidth > 0 && layoutWidth !== chartWidth) {
      setChartWidth(layoutWidth);
    }
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <LineChart
        data={data}
        width={chartWidth}
        height={height}
        withDots={false}
        withShadow={false}
        withInnerLines
        withOuterLines={false}
        withVerticalLabels={false}
        bezier
        chartConfig={{
          backgroundGradientFrom: colors.logo.chambray,
          backgroundGradientTo: colors.logo.chambray,
          backgroundGradientFromOpacity: 0,
          backgroundGradientToOpacity: 0,
          color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          labelColor: (opacity = 1) => `rgba(220,240,232,${opacity})`,
          propsForBackgroundLines: {
            stroke: 'rgba(255,255,255,0.15)',
          },
        }}
        style={styles.chart}
      />
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




