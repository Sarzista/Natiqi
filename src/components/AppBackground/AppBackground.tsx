/**
 * Shared soft background for main app screens.
 * - Static light gradient (Aramco‑inspired)
 * - Floating animated orb "particles"
 *
 * Used by Landing, Login, Dashboard so they all share the same visual canvas.
 */
import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedGradient } from '../AnimatedGradient';

const { width, height } = Dimensions.get('window');

const BG_GRADIENT = ['#eaf6f0', '#f9f9f9', '#e3eafc'];

const orbStyles = StyleSheet.create({
  orbBase: {
    position: 'absolute',
    borderRadius: width, // large for smooth circle
    overflow: 'hidden',
  },
  orbGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  orbTopLeft: {
    width: width * 0.9,
    height: width * 0.9,
    top: -width * 0.45,
    left: -width * 0.4,
  },
  orbTopRight: {
    width: width * 0.8,
    height: width * 0.8,
    top: height * 0.08,
    right: -width * 0.45,
  },
  orbBottomCenter: {
    width: width * 0.85,
    height: width * 0.85,
    bottom: -width * 0.5,
    left: width * 0.075,
  },
});

const BackgroundOrbs: React.FC = () => {
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);

  React.useEffect(() => {
    p1.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    p2.value = withRepeat(
      withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    p3.value = withRepeat(
      withTiming(1, { duration: 13000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => {
    const scale = 1 + 0.04 * Math.sin(p1.value * Math.PI * 2);
    const translateY = 10 * Math.sin(p1.value * Math.PI * 2);
    return {
      opacity: 0.22,
      transform: [{ scale }, { translateY }],
    };
  });

  const orb2Style = useAnimatedStyle(() => {
    const scale = 1 + 0.03 * Math.sin(p2.value * Math.PI * 2);
    const translateY = -12 * Math.sin(p2.value * Math.PI * 2);
    return {
      opacity: 0.18,
      transform: [{ scale }, { translateY }],
    };
  });

  const orb3Style = useAnimatedStyle(() => {
    const scale = 1 + 0.035 * Math.sin(p3.value * Math.PI * 2);
    const translateY = 14 * Math.sin(p3.value * Math.PI * 2);
    return {
      opacity: 0.18,
      transform: [{ scale }, { translateY }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Top-left green/teal orb */}
      <Animated.View style={[orbStyles.orbBase, orbStyles.orbTopLeft, orb1Style]}>
        <LinearGradient
          colors={[
            'rgba(34,197,94,0.45)',   // green
            'rgba(56,189,248,0.25)',  // cyan
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orbStyles.orbGradient}
        />
      </Animated.View>

      {/* Top-right blue orb */}
      <Animated.View style={[orbStyles.orbBase, orbStyles.orbTopRight, orb2Style]}>
        <LinearGradient
          colors={[
            'rgba(37,99,235,0.40)',   // blue
            'rgba(56,189,248,0.22)',  // cyan
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={orbStyles.orbGradient}
        />
      </Animated.View>

      {/* Bottom-center soft mix */}
      <Animated.View style={[orbStyles.orbBase, orbStyles.orbBottomCenter, orb3Style]}>
        <LinearGradient
          colors={[
            'rgba(34,197,94,0.35)',
            'rgba(37,99,235,0.25)',
          ]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={orbStyles.orbGradient}
        />
      </Animated.View>
    </Animated.View>
  );
};

export const AppBackground: React.FC = () => {
  return (
    <>
      <AnimatedGradient
        variant="static-gradient"
        colors={BG_GRADIENT}
      />
      <BackgroundOrbs />
    </>
  );
};


