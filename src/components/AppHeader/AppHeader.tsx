/**
 * Reusable app header component
 * Appears on Dashboard and other main screens (not Login)
 * Ready for logo and additional elements
 * Includes subtle animated glass background
 */
import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LanguageSwitch } from '../LanguageSwitch';
import { Logo } from '../Logo';
import { AppText } from '../AppText';
import { colors, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;

interface AppHeaderProps {
  logo?: ReactNode; // Custom logo component (optional, defaults to Logo component)
  showLogo?: boolean; // Show default logo (default: true)
  logoSize?: 'small' | 'medium' | 'large' | 'xlarge' | number; // Logo size
  logoVariant?: 'full' | 'icon' | 'text'; // Logo variant
  rightContent?: ReactNode; // Right side content (notifications, user menu, etc.)
  onLogoPress?: () => void; // Callback when logo is clicked
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  logo,
  showLogo = true,
  logoSize = isSmallScreen ? 'small' : 'medium',
  logoVariant = 'icon',
  rightContent,
  onLogoPress,
}) => {
  const { t, language } = useLanguage();
  const isArabic = language === 'ar';
  const brand = t('header.brand');
  const tagline = t('header.tagline');
  // Animated shimmer value for subtle moving highlight in the glass background
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 9000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    // Only modulate opacity so the background always covers full width
    const baseOpacity = 0.35;
    const pulse = 0.08 * Math.sin(shimmer.value * Math.PI * 2);
    return {
      opacity: baseOpacity + pulse,
    };
  });

  const hasCustomLogo = !!logo;
  const LogoContent = hasCustomLogo
    ? logo
    : showLogo
      ? (
        <Logo 
          variant={logoVariant} 
          background="transparent" 
          size={logoSize} 
        />
      )
      : null;

  return (
    <View style={styles.container}>
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

      {/* Left side: Logo with Title and Slogan */}
      {onLogoPress ? (
        <TouchableOpacity
          style={styles.leftSection}
          onPress={onLogoPress}
          activeOpacity={0.7}
        >
          {LogoContent && (
            <View style={[styles.logoWrapper, isArabic && styles.logoWrapperArabic]}>
              {LogoContent}
            </View>
          )}
          {!hasCustomLogo && (
            <View style={styles.headerTextContainer}>
              <AppText style={styles.headerTitle} skipLanguageFont>
                {brand}
              </AppText>
              <AppText style={styles.headerSlogan} skipLanguageFont>
                {tagline}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.leftSection}>
          {LogoContent && (
            <View style={[styles.logoWrapper, isArabic && styles.logoWrapperArabic]}>
              {LogoContent}
            </View>
          )}
          {!hasCustomLogo && (
            <View style={styles.headerTextContainer}>
              <AppText style={styles.headerTitle} skipLanguageFont>
                {brand}
              </AppText>
              <AppText style={styles.headerSlogan} skipLanguageFont>
                {tagline}
              </AppText>
            </View>
          )}
        </View>
      )}

      {/* Right side: Language switch + custom content */}
      <View style={styles.rightSection}>
        <View style={styles.languageSwitchWrapper}>
          <LanguageSwitch />
        </View>
        {rightContent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    paddingVertical: spacing.md,
    // Semi‑transparent so decorative background (shapes/gradient) clearly shows through
    backgroundColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.35)'
      : colors.primary[200],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
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
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  logoWrapper: {
    marginRight: spacing.md,
  },
  logoWrapperArabic: {
    marginRight: spacing.sm,
  },
  headerTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: isSmallScreen ? typography.sizes.xl : typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 2,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 20 : 24,
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'gradient-shift 5s ease infinite',
    }),
  },
  headerSlogan: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    ...(Platform.OS === 'web' && {
      fontSize: 11,
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'gradient-shift 5s ease infinite',
    }),
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageSwitchWrapper: {
    marginRight: spacing.md,
  },
});

