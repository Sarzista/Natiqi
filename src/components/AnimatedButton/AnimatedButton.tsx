/**
 * Animated button component with hover/press effects
 */
import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Platform, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { AppText } from '../AppText';
import { colors, spacing, typography } from '../../theme';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const scale = useSharedValue(1);
  const hoverScale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const gradientProgress = useSharedValue(0);

  // Animate gradient background - smooth flowing animation
  useEffect(() => {
    gradientProgress.value = withRepeat(
      withTiming(1, {
        duration: 5000, // 5 seconds for a more noticeable flow
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value * hoverScale.value }],
      opacity: opacity.value,
    };
  });

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    // Horizontal slide for visible gradient motion while keeping shape clean
    const translateX = interpolate(gradientProgress.value, [0, 1], [-80, 80]);

    return {
      transform: [
        { translateX },
      ],
    };
  });

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(0.8, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const handleMouseEnter = () => {
    if (!disabled && !loading) {
      hoverScale.value = withSpring(1.04, {
        damping: 15,
        stiffness: 200,
      });
    }
  };

  const handleMouseLeave = () => {
    hoverScale.value = withSpring(1, {
      damping: 15,
      stiffness: 200,
    });
  };

  const gradientColors = [
    colors.logo.chambray,
    colors.logo.calypso,
    colors.logo.paradiso,
    colors.logo.oceanGreen,
    colors.logo.emerald,
    colors.logo.chambray,
  ] as const;

  return (
    <AnimatedTouchableOpacity
      style={[styles.buttonContainer, disabled && styles.buttonDisabled, animatedStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: handleMouseEnter as any,
            onMouseLeave: handleMouseLeave as any,
          }
        : {})}
    >
      <Animated.View style={[styles.gradientWrapper, gradientAnimatedStyle]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
      </Animated.View>
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color={colors.text.white} />
        ) : (
          <AppText style={styles.buttonText}>{title}</AppText>
        )}
      </View>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradientWrapper: {
    position: 'absolute',
    top: 0,
    left: -80,
    right: -80,
    bottom: 0,
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  buttonContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.white,
  },
});

