/**
 * Gradient text background animation for react-native-web.
 * Use with animationDuration, animationTimingFunction, animationIterationCount
 * (the shorthand `animation` prop is rejected by RN Web's StyleSheet validator).
 */
export const gradientTextBgShiftKeyframes = {
  '0%': { backgroundPosition: '0% 50%' },
  '50%': { backgroundPosition: '100% 50%' },
  '100%': { backgroundPosition: '0% 50%' },
};
