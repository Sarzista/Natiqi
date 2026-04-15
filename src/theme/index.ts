/**
 * Centralized theme configuration
 * Import this file to access all theme values
 */
export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';
export { gradientTextBgShiftKeyframes } from './webGradientTextAnimation';

export const theme = {
  colors: require('./colors').colors,
  spacing: require('./spacing').spacing,
  typography: require('./typography').typography,
};


