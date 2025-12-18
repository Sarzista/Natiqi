/**
 * Animated gradient background component
 * Creates a smooth, flowing gradient animation
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors as themeColors } from '../../theme';

const { width, height } = Dimensions.get('window');

export type BackgroundVariant = 
  | 'static-gradient'      // Option 1: Static gradient
  | 'light-solid'          // Option 2: Light solid background
  | 'radial-gradient'       // Option 3: Subtle radial gradient
  | 'two-tone'             // Option 4: Two-tone static
  | 'slow-animation'       // Option 5: Very slow animation
  | 'decorative-shapes';   // Option 6: Decorative geometric shapes

interface AnimatedGradientProps {
  variant?: BackgroundVariant;
  colors?: string[];
  style?: object;
}

// Gradient color sets for different variants
const gradientColors = {
  full: [
    themeColors.logo.chambray,      // #375d98 - Start with blue
    themeColors.logo.calypso,       // #397093 - Blue-green
    themeColors.logo.paradiso,      // #38838d - Teal
    themeColors.logo.oceanGreenAlt, // #3a9a88 - Teal-green
    themeColors.logo.oceanGreen,    // #3aab83 - Ocean Green
    themeColors.logo.emerald,       // #47be7f - Emerald
  ],
  twoTone: [
    themeColors.logo.oceanGreen,    // #3aab83 - Ocean Green
    themeColors.logo.emerald,       // #47be7f - Emerald
  ],
};

export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({
  variant = 'light-solid', // Default: Light Solid (Option 2)
  colors,
  style,
}) => {
  const progress = useSharedValue(0);
  
  // Animation values for decorative shapes
  const shape1Progress = useSharedValue(0);
  const shape2Progress = useSharedValue(0);
  const shape3Progress = useSharedValue(0);
  const shape4Progress = useSharedValue(0);
  const shape5Progress = useSharedValue(0);
  const shape6Progress = useSharedValue(0);
  const shape7Progress = useSharedValue(0);

  // Determine colors based on variant
  const getColors = () => {
    if (colors) return colors;
    
    switch (variant) {
      case 'two-tone':
        return gradientColors.twoTone;
      case 'light-solid':
        return [themeColors.logo.swansDown, themeColors.logo.swansDown];
      case 'static-gradient':
      case 'radial-gradient':
      case 'slow-animation':
      default:
        return gradientColors.full;
    }
  };

  const gradientColorsArray = getColors();

  // Animation for slow-animation variant
  useEffect(() => {
    if (variant === 'slow-animation') {
      progress.value = withRepeat(
        withTiming(1, {
          duration: 25000, // Much slower - 25 seconds
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }
  }, [variant]);

  // Animations for decorative shapes - more noticeable floating effect
  useEffect(() => {
    if (variant === 'decorative-shapes') {
      // Each shape animates at different speeds for organic feel
      // Faster durations and more movement for visibility
      shape1Progress.value = withRepeat(
        withTiming(1, {
          duration: 12000, // 12 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      shape2Progress.value = withRepeat(
        withTiming(1, {
          duration: 10000, // 10 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      shape3Progress.value = withRepeat(
        withTiming(1, {
          duration: 11000, // 11 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      shape4Progress.value = withRepeat(
        withTiming(1, {
          duration: 13000, // 13 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      shape5Progress.value = withRepeat(
        withTiming(1, {
          duration: 10500, // 10.5 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      shape6Progress.value = withRepeat(
        withTiming(1, {
          duration: 11500, // 11.5 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      shape7Progress.value = withRepeat(
        withTiming(1, {
          duration: 12500, // 12.5 seconds - faster
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }
  }, [variant]);

  const animatedStyle = useAnimatedStyle(() => {
    if (variant === 'slow-animation') {
      const translateX = interpolate(progress.value, [0, 1], [-width * 0.2, width * 0.2]);
      const translateY = interpolate(progress.value, [0, 1], [-height * 0.1, height * 0.1]);
      const rotate = interpolate(progress.value, [0, 1], [0, 5]); // Less rotation

      return {
        transform: [
          { translateX },
          { translateY },
          { rotate: `${rotate}deg` },
        ],
      };
    }
    // No animation for other variants
    return {};
  });

  // Animated styles for each decorative shape - increased movement ranges
  const shape1Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape1Progress.value, [0, 1], [-40, 40]); // Increased from ±15
    const translateX = interpolate(shape1Progress.value, [0, 1], [-30, 30]); // Increased from ±10
    const rotate = interpolate(shape1Progress.value, [0, 1], [40, 50]);
    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const shape2Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape2Progress.value, [0, 1], [-50, 50]); // Increased from ±20
    const translateX = interpolate(shape2Progress.value, [0, 1], [-40, 40]); // Increased from ±15
    return {
      transform: [
        { translateX },
        { translateY },
      ],
    };
  });

  const shape3Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape3Progress.value, [0, 1], [-60, 60]); // Increased from ±25
    return {
      transform: [{ translateY }],
    };
  });

  const shape4Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape4Progress.value, [0, 1], [-45, 45]); // Increased from ±18
    const translateX = interpolate(shape4Progress.value, [0, 1], [-35, 35]); // Increased from ±12
    const rotate = interpolate(shape4Progress.value, [0, 1], [-8, 8]); // Increased from ±5
    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const shape5Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape5Progress.value, [0, 1], [-55, 55]); // Increased from ±22
    const translateX = interpolate(shape5Progress.value, [0, 1], [-45, 45]); // Increased from ±18
    return {
      transform: [
        { translateX },
        { translateY },
      ],
    };
  });

  const shape6Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape6Progress.value, [0, 1], [-42, 42]); // Increased from ±16
    const translateX = interpolate(shape6Progress.value, [0, 1], [-38, 38]); // Increased from ±14
    const rotate = interpolate(shape6Progress.value, [0, 1], [-25, -10]); // Increased range
    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const shape7Animated = useAnimatedStyle(() => {
    if (variant !== 'decorative-shapes') return {};
    const translateY = interpolate(shape7Progress.value, [0, 1], [-48, 48]); // Increased from ±20
    const translateX = interpolate(shape7Progress.value, [0, 1], [-42, 42]); // Increased from ±16
    const rotate = interpolate(shape7Progress.value, [0, 1], [20, 35]); // Increased from 20-30
    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // Radial gradient for Option 3
  if (variant === 'radial-gradient') {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.radialContainer}>
          <LinearGradient
            colors={gradientColorsArray}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.radialGradient}
          />
        </View>
      </View>
    );
  }

  // Light solid for Option 2
  if (variant === 'light-solid') {
    return (
      <View style={[styles.container, styles.lightSolid, style]}>
        {/* Optional: Add subtle texture or pattern here */}
      </View>
    );
  }

  // Decorative shapes for Option 6
  if (variant === 'decorative-shapes') {
    return (
      <View style={[styles.container, styles.lightSolid, style]}>
        <View style={styles.shapesContainer}>
          {/* Right side shapes */}
          {/* Shape 1 - Large rotated rectangle with gradient */}
          <Animated.View style={[styles.decorativeShape, styles.shape1, shape1Animated]}>
            <LinearGradient
              colors={[themeColors.logo.vistaBlue, themeColors.logo.swansDown]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shapeGradient}
            />
          </Animated.View>
          {/* Shape 2 - Medium circle */}
          <Animated.View style={[styles.decorativeShape, styles.shape2, shape2Animated]} />
          {/* Shape 3 - Vertical gradient bar */}
          <Animated.View style={[styles.decorativeShape, styles.shape3, shape3Animated]}>
            <LinearGradient
              colors={[themeColors.logo.calypso, themeColors.logo.paradiso]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.shape3Gradient}
            />
          </Animated.View>
          {/* Shape 4 - Small rounded rectangle */}
          <Animated.View style={[styles.decorativeShape, styles.shape4, shape4Animated]} />
          
          {/* Left side shapes for balance */}
          {/* Shape 5 - Large circle on left */}
          <Animated.View style={[styles.decorativeShape, styles.shape5, shape5Animated]}>
            <LinearGradient
              colors={[themeColors.logo.oceanGreen, themeColors.logo.emerald]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shapeGradient}
            />
          </Animated.View>
          {/* Shape 6 - Small oval on left */}
          <Animated.View style={[styles.decorativeShape, styles.shape6, shape6Animated]} />
          {/* Shape 7 - Medium rectangle on left */}
          <Animated.View style={[styles.decorativeShape, styles.shape7, shape7Animated]}>
            <LinearGradient
              colors={[themeColors.logo.rockBlue, themeColors.logo.vistaBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shapeGradient}
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  // Static gradient (Option 1) or Two-tone (Option 4) or Slow animation (Option 5)
  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.gradientContainer, animatedStyle]}>
        <LinearGradient
          colors={gradientColorsArray}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  gradientContainer: {
    width: width * 2,
    height: height * 2,
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  lightSolid: {
    backgroundColor: themeColors.logo.swansDown, // #dcf0e8
  },
  radialContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialGradient: {
    width: width * 1.5,
    height: height * 1.5,
    borderRadius: width * 0.75,
  },
  shapesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  decorativeShape: {
    position: 'absolute',
  },
  shapeGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  shape1: {
    height: width * 1.3,
    width: width * 1.3,
    top: -width * 0.2,
    right: width * 0.25,
    borderRadius: 0,
    opacity: 0.2,
    transform: [{ rotate: '45deg' }],
  },
  shape2: {
    height: width * 0.55,
    width: width * 0.55,
    backgroundColor: themeColors.logo.calypso,
    top: -width * 0.35,
    right: width * 0.05,
    borderRadius: width * 0.275,
    opacity: 0.18,
  },
  shape3: {
    height: height * 1.2,
    width: width * 0.35,
    top: -height * 0.05,
    right: 0,
    borderRadius: width * 0.08,
    opacity: 0.16,
  },
  shape3Gradient: {
    flex: 1,
    borderRadius: width * 0.08,
  },
  shape4: {
    height: width * 0.85,
    width: width * 0.5,
    backgroundColor: themeColors.logo.paradiso,
    top: height * 0.65,
    right: width * 0.1,
    borderRadius: width * 0.2,
    opacity: 0.2,
  },
  // Left side shapes
  shape5: {
    height: width * 0.7,
    width: width * 0.7,
    top: height * 0.15,
    left: -width * 0.2,
    borderRadius: width * 0.35,
    opacity: 0.18,
  },
  shape6: {
    height: width * 0.4,
    width: width * 0.6,
    backgroundColor: themeColors.logo.oceanGreenAlt,
    top: height * 0.5,
    left: -width * 0.15,
    borderRadius: width * 0.2,
    opacity: 0.16,
    transform: [{ rotate: '-15deg' }],
  },
  shape7: {
    height: width * 0.5,
    width: width * 0.6,
    top: height * 0.75,
    left: width * 0.05,
    borderRadius: width * 0.1,
    opacity: 0.14,
    transform: [{ rotate: '25deg' }],
  },
});

