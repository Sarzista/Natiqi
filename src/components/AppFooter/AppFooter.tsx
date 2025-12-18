/**
 * Reusable app footer component
 * Glassmorphism bar with its own background, unified across screens
 */
import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme';

interface AppFooterProps {
  children?: ReactNode;
  style?: object;
}

export const AppFooter: React.FC<AppFooterProps> = ({ children, style }) => {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 10000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const baseOpacity = 0.35;
    const pulse = 0.08 * Math.sin(shimmer.value * Math.PI * 2);
    return {
      opacity: baseOpacity + pulse,
    };
  });

  return (
    <View style={[styles.container, style]}>
      {/* Animated glass background overlay */}
      <Animated.View pointerEvents="none" style={[styles.glassOverlay, shimmerStyle]}>
        <LinearGradient
          colors={[
            'rgba(0,166,81,0.20)',   // Aramco green tint
            'rgba(27,54,93,0.30)',   // Aramco blue tint
            'rgba(0,166,81,0.18)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassGradient}
        />
      </Animated.View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    // Match AppHeader glass background: let the global shapes/gradient show through
    backgroundColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.18)',
    borderTopWidth: 1,
    borderTopColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.3)'
      : colors.primary[200],
    // Mirror AppHeader glass / shadow so it "floats" above the gradient
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glassGradient: {
    flex: 1,
  },
});


