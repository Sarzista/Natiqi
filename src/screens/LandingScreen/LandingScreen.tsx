/**
 * Landing Screen - Role Selection
 * Visual + layout inspired by Aramco Contract AI landing page (Copilot Project 24)
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, Image, Linking, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PatientSvg from '../../../assets/patient.svg';
import UserMdSvg from '../../../assets/user-md.svg';
import AdminAltSvg from '../../../assets/admin-alt.svg';
import ArrowRightSvg from '../../../assets/arrow-small-right.svg';
import { AppBackground } from '../../components/AppBackground';
import { AppHeader } from '../../components/AppHeader';
import { AppFooter } from '../../components/AppFooter';
import { AppText } from '../../components/AppText';
import { Logo } from '../../components/Logo';
import { useLanguage } from '../../context/LanguageContext';
import { colors, spacing, typography } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = width < 600;
const isLargeScreen = width >= 1200;

// Aramco-inspired landing palette (local to this screen, does not affect global theme)
const landingTheme = {
  lightBgTop: '#eaf6f0',
  lightBgMid: '#f9f9f9',
  lightBgBottom: '#e3eafc',
  primaryGreen: '#00A651',
  primaryBlue: '#1B365D',
  accentTeal: '#00C1D5',
  textHeading: '#1B365D',
  textBody: '#1f2933',
  textMuted: '#6b7280',
  navBg: 'rgba(255, 255, 255, 0.85)',
  navBorder: 'rgba(148, 163, 184, 0.4)',
  cardBg: 'rgba(255, 255, 255, 0.9)',
  cardBorder: 'rgba(226, 232, 240, 0.9)',
  cardShadow: 'rgba(15, 23, 42, 0.16)',
  footerBg: 'rgba(255, 255, 255, 0.9)',
  footerBorder: 'rgba(226, 232, 240, 0.9)',
};


// Create responsive styles function
// Typed as `any` to keep layout flexible across native and web targets without fighting RN's style types.
const getResponsiveStyles = (): any => ({
  content: {
    alignItems: 'center' as const,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    width: '100%',
    // Use numeric maxWidth only on large screens to satisfy React Native types
    maxWidth: isLargeScreen ? 1400 : undefined,
    alignSelf: 'center' as const,
    flex: 1,
  },
  heroTitle: {
    fontSize: isSmallScreen ? typography.sizes['3xl'] : typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    color: landingTheme.textHeading,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 36 : isLargeScreen ? 64 : 48,
      // Match Natiqi header gradient colors/animation
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      backgroundSize: '200% 200%',
      animation: 'gradient-move 3s ease infinite',
    }),
  },
  heroTagline: {
    fontSize: isSmallScreen ? typography.sizes.lg : typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: landingTheme.primaryBlue,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 20 : isLargeScreen ? 28 : 24,
    }),
  },
  heroDescription: {
    fontSize: isSmallScreen ? typography.sizes.base : typography.sizes.lg,
    fontWeight: typography.weights.normal,
    color: landingTheme.textBody,
    marginBottom: spacing.lg,
    textAlign: 'center' as const,
    lineHeight: isSmallScreen ? 22 : 28,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.xl,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 16 : isLargeScreen ? 20 : 18,
      maxWidth: 600,
    }),
  },
  cardsContainer: {
    width: '100%',
    paddingHorizontal: isSmallScreen ? spacing.xs : 0,
  },
  cardsContainerTablet: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'stretch' as const,
    paddingHorizontal: isSmallScreen ? spacing.sm : spacing.md,
  },
  cardWrapper: {
    flex: 1,
    marginHorizontal: isSmallScreen ? spacing.xs : spacing.sm,
    minWidth: isTablet ? 0 : '100%',
    maxWidth: isTablet ? '33%' : '100%',
  },
  card: {
    // Solid white cards to sit on top of the animated glow frame
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: isSmallScreen ? spacing.md : spacing.lg,
    marginBottom: isTablet ? 0 : spacing.md,
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? landingTheme.cardBorder : colors.primary[200],
    shadowColor: landingTheme.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    width: '100%',
    // Slightly shorter to feel more rectangular and less tall
    minHeight: isSmallScreen ? 200 : 230,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
    }),
  },
  icon: {
    fontSize: isSmallScreen ? 32 : 40,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: isSmallScreen ? typography.sizes.lg : typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: landingTheme.textHeading,
    marginBottom: spacing.sm,
    textAlign: 'center' as const,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 18 : isLargeScreen ? 22 : 20,
    }),
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    color: landingTheme.textMuted,
    textAlign: 'center' as const,
    lineHeight: isSmallScreen ? 18 : 20,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 13 : 14,
    }),
  },
  headerBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Platform.OS === 'web' ? landingTheme.navBg : colors.background.white,
    borderBottomWidth: 1,
    borderBottomColor: Platform.OS === 'web' ? landingTheme.navBorder : colors.primary[200],
    shadowColor: landingTheme.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 30,
    }),
  },
  headerLeft: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-start' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  headerLogo: {
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: isSmallScreen ? typography.sizes.xl : typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: landingTheme.textHeading,
    marginBottom: 2,
    ...(Platform.OS === 'web' && {
      fontSize: isSmallScreen ? 20 : 24,
      backgroundImage: `linear-gradient(135deg, ${landingTheme.primaryGreen}, ${landingTheme.primaryBlue}, ${landingTheme.primaryGreen})`,
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
    color: landingTheme.textMuted,
    ...(Platform.OS === 'web' && {
      fontSize: 11,
      backgroundImage: `linear-gradient(135deg, ${landingTheme.primaryGreen}, ${landingTheme.primaryBlue}, ${landingTheme.primaryGreen})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'gradient-shift 5s ease infinite',
    }),
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start' as const,
    // No forced minHeight so we don't get extra empty scroll area
    paddingTop: Platform.OS === 'web' ? 120 : (isSmallScreen ? spacing.lg : spacing.xl),
    paddingBottom: isSmallScreen ? spacing.lg : spacing.xl,
  },
  // Footer visual tokens now come from shared AppFooter. Keep only content layout here.
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logosContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 0,
  },
  iauLogo: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logoDivider: {
    width: 1,
    height: isSmallScreen ? 25 : 30,
    backgroundColor: landingTheme.textMuted,
    opacity: 0.3,
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  vision2030Logo: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  partnerLogoImage: {
    width: isSmallScreen ? 80 : 100,
    height: isSmallScreen ? 30 : 35,
    opacity: 0.9,
  },
});

type LandingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

interface LandingScreenProps {
  navigation: LandingScreenNavigationProp;
}

export type UserRole = 'admin' | 'specialist' | 'patient';

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void;
  delay?: number; // kept for API compatibility, no longer used for entry animation
}

const RoleCard: React.FC<RoleCardProps> = ({ title, description, icon, onPress, delay }) => {
  // Start at full size and opacity so there is no entry animation.
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const responsiveStyles = getResponsiveStyles();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      shadowOpacity: shadowOpacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    shadowOpacity.value = withTiming(0.2, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    shadowOpacity.value = withTiming(0.1, { duration: 150 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.roleButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardTextColumn}>
            <AppText style={[responsiveStyles.cardTitle, styles.cardTitleText]}>
              {title}
            </AppText>
            <AppText style={[responsiveStyles.cardDescription, styles.cardDescriptionText]}>
              {description}
            </AppText>
          </View>
          <View style={styles.cardIconPill}>
            {icon}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface PatientRoleCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  onPress: () => void;
  isArabic?: boolean;
}

const PatientRoleCard: React.FC<PatientRoleCardProps> = ({
  title,
  description,
  icon,
  onPress,
  isArabic,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const hover = useSharedValue(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const responsiveStyles = getResponsiveStyles();
  const enableFillerHover = false; // keep filler hover animation code available, but disabled by default
  const gradientShift = useSharedValue(0);

  React.useEffect(() => {
    gradientShift.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      shadowOpacity: shadowOpacity.value,
    };
  });

  const fillerStyle = useAnimatedStyle(() => {
    if (!enableFillerHover) {
      // Static position (no hover animation), but keep transform logic for future use
      return {
        transform: [{ translateX: -100 }],
      };
    }

    // Move a large filler horizontally so it fully covers the button, while starting more visible
    const translateX = -100 + hover.value * 400; // -100 -> +300
    return {
      transform: [{ translateX }],
    };
  });

  const gradientMoveStyle = useAnimatedStyle(() => {
    // Move gradient horizontally inside the circle, similar to CSS background-position animation
    const translateX = -150 + gradientShift.value * 300; // -150 -> +150
    return { transform: [{ translateX }] };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    shadowOpacity.value = withTiming(0.2, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    shadowOpacity.value = withTiming(0.1, { duration: 150 });
  };

  const handleHoverChange = (isHovering: boolean) => {
    setIsHovered(isHovering);
    if (enableFillerHover) {
      hover.value = withTiming(isHovering ? 1 : 0, { duration: 300 });
    }
  };

  // Icon and circle swap colors on hover:
  // - Rest: dark icon on white circle
  // - Hover: white icon on dark circle
  const iconColor = isHovered ? colors.text.white : landingTheme.textHeading;
  const renderedIcon = React.isValidElement(icon)
    ? React.cloneElement(icon as any, { fill: iconColor } as any)
    : icon;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.patientRoleButton,
          {
            // Card background: white by default, brand teal on hover
            backgroundColor: isHovered ? colors.logo.paradiso : '#ffffff',
          },
        ]}
        onPress={onPress}
        onPressIn={() => {
          handlePressIn();
          handleHoverChange(true);
        }}
        onPressOut={() => {
          handlePressOut();
          handleHoverChange(false);
        }}
        onHoverIn={() => handleHoverChange(true)}
        onHoverOut={() => handleHoverChange(false)}
      >
        {/* Filler circle behind content */}
        <Animated.View
          style={[
            styles.patientFiller,
            fillerStyle,
            {
              // On hover the circle becomes solid white; otherwise show animated green gradient
              backgroundColor: isHovered ? '#ffffff' : 'transparent',
            },
          ]}
        >
          {!isHovered && (
            <Animated.View style={[styles.patientGradientFill, gradientMoveStyle]}>
              <LinearGradient
                colors={[colors.logo.oceanGreen, colors.logo.paradiso]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.patientCardContent}>
          <View
            style={[
              styles.patientIconPill,
              { backgroundColor: isHovered ? landingTheme.textHeading : '#ffffff' },
            ]}
          >
            {renderedIcon}
          </View>
          <View style={[styles.cardTextColumn, styles.patientTextColumn]}>
            <AppText
              style={[
                styles.patientTitle,
                isArabic && styles.patientTitleArabic,
                { color: isHovered ? colors.text.white : landingTheme.textHeading },
              ]}
            >
              {title}
            </AppText>
            {description && (
              <AppText
                style={[
                  responsiveStyles.cardDescription,
                  styles.cardDescriptionText,
                  { color: isHovered ? colors.text.white : landingTheme.textBody },
                ]}
              >
                {description}
              </AppText>
            )}
          </View>
        </View>
        <View style={styles.patientLoginCta}>
          <AppText
            style={[
              styles.patientLoginText,
              { color: isHovered ? colors.text.white : colors.logo.paradiso },
            ]}
          >
            Login
          </AppText>
          <ArrowRightSvg
            width={18}
            height={18}
            fill={isHovered ? colors.text.white : colors.logo.paradiso}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const { t, language: currentLanguage, isRTL } = useLanguage();
  const responsiveStyles = getResponsiveStyles();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleRoleSelect = (role: UserRole) => {
    // Navigate to login with role parameter
    navigation.navigate('Login', { role });
  };

  const handleLogoPress = () => {
    // Scroll to top if already on landing page
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Shared soft gradient + floating orbs background */}
      <AppBackground />

      {/* Unified glass header (shared with Dashboard / Login) */}
      <AppHeader onLogoPress={handleLogoPress} />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={responsiveStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={responsiveStyles.content}>
          {/* Hero Section - Natiqi landing layout */}
          <View style={styles.heroSection}>
            <View style={[styles.heroBrandRow, isRTL && styles.heroBrandRowRtl]}>
              <Logo
                variant="icon"
                background="transparent"
                // Numeric size so we can make the hero icon much larger than header
                size={isSmallScreen ? 72 : 120}
                style={[styles.heroLogo, isRTL && styles.heroLogoRtl]}
              />
              <View style={[styles.heroBrandTextColumn, isRTL && styles.heroBrandTextColumnRtl]}>
                <AppText style={[responsiveStyles.heroTitle, styles.heroTitleText, isRTL && styles.heroTitleTextRtl]}>
                  {t('header.brand')}
                </AppText>
                <AppText style={[responsiveStyles.heroTagline, styles.heroTaglineText, isRTL && styles.heroTaglineTextRtl]}>
                  {t('header.tagline')}
                </AppText>
              </View>
            </View>

            <AppText style={responsiveStyles.heroDescription}>
              {currentLanguage === 'ar'
                ? 'ناطيقي يحوّل أنماط تخطيط الدماغ ‎(EEG)‎ إلى عبارات واضحة، ليمنح المرضى غير القادرين على الكلام وفريق الرعاية قناة تواصل موثوقة ولحظية.'
                : 'Natiqi uses non‑invasive EEG signals to turn brain activity into clear phrases, giving non‑verbal patients and care teams a reliable, real‑time channel for communication.'}
            </AppText>
          </View>

          {/* Role Cards Container */}
          <View style={[responsiveStyles.cardsContainer, isTablet && responsiveStyles.cardsContainerTablet]}>
            <View style={isTablet && responsiveStyles.cardWrapper}>
              <PatientRoleCard
                title={currentLanguage === 'ar' ? 'ناطيقي للمشرفين' : 'Natiqi Admin'}
                icon={
                  <AdminAltSvg
                    width={isSmallScreen ? 40 : 48}
                    height={isSmallScreen ? 40 : 48}
                    fill={colors.logo.chambray}
                  />
                }
                onPress={() => handleRoleSelect('admin')}
                isArabic={currentLanguage === 'ar'}
              />
            </View>
            <View style={isTablet && responsiveStyles.cardWrapper}>
              <PatientRoleCard
                title={currentLanguage === 'ar' ? 'ناطيقي للطاقم الطبي' : 'Natiqi Medical'}
                icon={
                  <UserMdSvg
                    width={isSmallScreen ? 40 : 48}
                    height={isSmallScreen ? 40 : 48}
                    fill={colors.logo.paradiso}
                  />
                }
                onPress={() => handleRoleSelect('specialist')}
                isArabic={currentLanguage === 'ar'}
              />
            </View>
            <View style={isTablet && responsiveStyles.cardWrapper}>
              <PatientRoleCard
                title={currentLanguage === 'ar' ? 'ناطيقي للمستفيدين' : 'Natiqi Recipient'}
                icon={
                  <PatientSvg
                    width={isSmallScreen ? 40 : 48}
                    height={isSmallScreen ? 40 : 48}
                    fill={colors.logo.oceanGreen}
                  />
                }
                onPress={() => handleRoleSelect('patient')}
                isArabic={currentLanguage === 'ar'}
              />
            </View>
          </View>
        </View>
      </ScrollView>

        {/* Unified glass footer with partner logos */}
        <AppFooter>
          <View style={responsiveStyles.logosContainer}>
            <TouchableOpacity
              style={responsiveStyles.iauLogo}
              onPress={() => Linking.openURL('https://www.iau.edu.sa/en/about-us')}
              activeOpacity={0.7}
            >
              <Image
                source={require('../../../assets/iau-university.png')}
                style={responsiveStyles.partnerLogoImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View style={responsiveStyles.logoDivider} />
            <TouchableOpacity
              style={responsiveStyles.vision2030Logo}
              onPress={() => Linking.openURL('https://www.vision2030.gov.sa/en')}
              activeOpacity={0.7}
            >
              <Image
                source={require('../../../assets/2030-vision.png')}
                style={responsiveStyles.partnerLogoImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </AppFooter>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
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
  heroSection: {
    alignItems: 'center',
    // Even tighter gap above role cards
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.lg,
    marginBottom: spacing.md,
  },
  heroBrandRowRtl: {
    flexDirection: 'row-reverse',
  },
  heroLogo: {
    // allow logo to scale but keep aspect
  },
  heroLogoRtl: {
    transform: [{ scaleX: -1 }],
  },
  heroBrandTextColumn: {
    flexDirection: 'column',
    alignItems: isSmallScreen ? 'center' : 'flex-start',
  },
  heroBrandTextColumnRtl: {
    alignItems: isSmallScreen ? 'center' : 'flex-end',
  },
  heroTitleText: {
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  heroTitleTextRtl: {
    textAlign: isSmallScreen ? 'center' : 'right',
    paddingBottom: 4,
  },
  heroTaglineText: {
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  heroTaglineTextRtl: {
    textAlign: isSmallScreen ? 'center' : 'right',
  },
  roleButton: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingVertical: spacing.lg,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? landingTheme.cardBorder : colors.primary[200],
    shadowColor: landingTheme.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    // Match previous card height so the new buttons feel identical in size
    minHeight: isSmallScreen ? 200 : 230,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
  },
  cardIconPill: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextColumn: {
    flex: 1,
  },
  cardTitleText: {
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  cardDescriptionText: {
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  patientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
  },
  patientTitle: {
    fontSize: isSmallScreen ? typography.sizes['3xl'] : typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  patientTitleArabic: {
    fontSize: isSmallScreen ? typography.sizes['2xl'] : typography.sizes['3xl'],
  },
  patientIconPill: {
    minWidth: 88,
    minHeight: 88,
    borderRadius: 44, // bigger circle
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  patientTextColumn: {
    marginLeft: spacing.lg * 2.5,
  },
  patientLoginCta: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  patientLoginText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  patientRoleButton: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingVertical: spacing.lg,
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.lg,
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? landingTheme.cardBorder : colors.primary[200],
    shadowColor: landingTheme.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    minHeight: isSmallScreen ? 200 : 230,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  patientFiller: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: colors.logo.oceanGreen,
    top: -200,
    left: -340,
    opacity: 0.9,
    overflow: 'hidden', // ensure gradient child is clipped to the circular shape
  },
  patientGradientFill: {
    position: 'absolute',
    width: '200%',
    height: '100%',
  },
});

