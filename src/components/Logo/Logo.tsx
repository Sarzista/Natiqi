/**
 * Logo component
 * Handles logo display with different sizes, styles, and variants
 * Supports: FullLogo, IconOnly, TextOnly with transparent/solid backgrounds
 */
import React from 'react';
import { Image, StyleSheet, ImageStyle, ViewStyle, Platform, StyleProp } from 'react-native';
import { colors } from '../../theme';

export type LogoVariant = 'full' | 'icon' | 'text';
export type LogoBackground = 'transparent' | 'solid';

interface LogoProps {
  /**
   * Logo variant: 'full' | 'icon' | 'text'
   * - 'full': Full logo with icon and text
   * - 'icon': Icon only
   * - 'text': Text only
   */
  variant?: LogoVariant;
  /**
   * Background type: 'transparent' | 'solid'
   * - 'transparent': Uses transparent background version
   * - 'solid': Uses solid background version
   */
  background?: LogoBackground;
  /**
   * Custom logo source (overrides variant/background)
   * - require('./path/to/logo.png') for local assets
   * - { uri: 'https://...' } for remote images
   */
  source?: any;
  /**
   * Size preset: 'small' | 'medium' | 'large' | 'xlarge'
   * Or provide custom width/height
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge' | number;
  /**
   * Custom width (overrides size preset)
   */
  width?: number;
  /**
   * Custom height (overrides size preset)
   */
  height?: number;
  /**
   * Additional styles
   */
  style?: StyleProp<ImageStyle | ViewStyle>;
  /**
   * Tint color (for monochrome logos)
   */
  tintColor?: string;
  /**
   * Resize mode
   */
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center' | 'repeat';
}

const sizeMap = {
  small: { width: 32, height: 32 },
  medium: { width: 48, height: 48 },
  large: { width: 64, height: 64 },
  xlarge: { width: 96, height: 96 },
};

// Logo source map - maps variant + background to actual asset files
const logoSources: Record<LogoVariant, Record<LogoBackground, any>> = {
  full: {
    transparent: require('../../../assets/FullLogo_Transparent_NoBuffer.png'),
    solid: require('../../../assets/FullLogo.png'),
  },
  icon: {
    transparent: require('../../../assets/IconOnly_Transparent_NoBuffer.png'),
    solid: require('../../../assets/IconOnly_Transparent.png'), // Fallback if solid version doesn't exist
  },
  text: {
    transparent: require('../../../assets/TextOnly.png'),
    solid: require('../../../assets/TextOnly.png'), // Same for text-only
  },
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'icon',
  background = 'transparent',
  source,
  size = 'medium',
  width,
  height,
  style,
  tintColor,
  resizeMode = 'contain',
}) => {
  // Use custom source if provided, otherwise use variant/background mapping
  const logoSource = source || logoSources[variant][background];

  // Determine dimensions
  let logoWidth: number;
  let logoHeight: number;

  if (width && height) {
    logoWidth = width;
    logoHeight = height;
  } else if (typeof size === 'number') {
    logoWidth = size;
    logoHeight = size;
  } else {
    const sizeDimensions = sizeMap[size];
    logoWidth = sizeDimensions.width;
    logoHeight = sizeDimensions.height;
  }

  // For full logo, adjust aspect ratio (full logos are usually wider)
  if (variant === 'full' && typeof size !== 'number' && !width && !height) {
    logoWidth = logoWidth * 2.5; // Full logos are typically 2.5x wider
  }

  return (
    <Image
      source={logoSource}
      style={[
        {
          width: logoWidth,
          height: logoHeight,
        },
        tintColor && { tintColor },
        style,
      ]}
      resizeMode={resizeMode}
    />
  );
};

