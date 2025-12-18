/**
 * Header controls: language + theme icons
 * - Language: toggles EN/AR on tap
 * - Theme: visual placeholder for future light/dark toggle
 * Shared across Landing, Login, Dashboard headers for a unified look.
 */
import React from 'react';
import { View, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import GlobeSvg from '../../../assets/globe.svg';
import NightDaySvg from '../../../assets/night-day.svg';
import { useLanguage } from '../../context/LanguageContext';
import { colors, spacing } from '../../theme';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;

const GlobeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = isSmallScreen ? 24 : 26,
  color = colors.logo.chambray,
}) => (
  <GlobeSvg width={size} height={size} fill={color} />
);

const ThemeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = isSmallScreen ? 24 : 26,
  color = colors.logo.chambray,
}) => (
  <NightDaySvg width={size} height={size} fill={color} />
);

export const LanguageSwitch: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguagePress = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleThemePress = () => {
    // TODO: wire to real light/dark theme when available
    // For now this is only a visual control.
  };

  return (
    <View style={styles.container}>
      {/* Language icon */}
      <Pressable
        onPress={handleLanguagePress}
        style={({ hovered, pressed }) => [
          styles.iconButton,
          (hovered || pressed) && styles.iconButtonHovered,
        ]}
      >
        {({ hovered, pressed }) => {
          const isActive = hovered || pressed;
          const baseColor =
            language === 'ar' ? colors.primary[600] : colors.logo.chambray;
          const color = isActive ? colors.primary[600] : baseColor;

          return (
            <GlobeIcon
          size={isSmallScreen ? 24 : 26}
              color={color}
        />
          );
        }}
      </Pressable>

      {/* Theme icon */}
      <Pressable
        onPress={handleThemePress}
        style={({ hovered, pressed }) => [
          styles.iconButton,
          (hovered || pressed) && styles.iconButtonHovered,
        ]}
      >
        {({ hovered, pressed }) => {
          const isActive = hovered || pressed;
          const color = isActive ? colors.primary[600] : colors.logo.chambray;

          return (
            <ThemeIcon
          size={isSmallScreen ? 24 : 26}
              color={color}
        />
          );
        }}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  iconButtonHovered: {
    transform: [{ scale: 1.08 }],
  },
});
