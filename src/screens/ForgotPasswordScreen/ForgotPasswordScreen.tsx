/**
 * Forgot Password Screen - matches login glass card styling
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppBackground } from '../../components/AppBackground';
import { AppHeader } from '../../components/AppHeader';
import { AppFooter } from '../../components/AppFooter';
import { AppText } from '../../components/AppText';
import { AnimatedButton } from '../../components/AnimatedButton';
import { colors, spacing, typography, gradientTextBgShiftKeyframes } from '../../theme';
import { RootStackParamList } from '../../types/navigation';
import { UserRole } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;

type ForgotPasswordNavProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
type ForgotPasswordRouteProp = RouteProp<RootStackParamList, 'ForgotPassword'>;

interface ForgotPasswordScreenProps {
  navigation: ForgotPasswordNavProp;
  route: ForgotPasswordRouteProp;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation, route }) => {
  const [nationalId, setNationalId] = useState('');
  const [focusedField, setFocusedField] = useState<'id' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { t, isRTL } = useLanguage();

  const role: UserRole = route.params?.role ?? 'RegisteredUser';

  const nationalIdInputStyle = {
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    ...(Platform.OS !== 'web' && { writingDirection: 'ltr' as const }),
  };

  const handleNationalIdChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setNationalId(digitsOnly);
  };

  const handleSendCode = () => {
    if (!nationalId.trim()) {
      setError(t('forgotPassword.errorEmpty'));
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      navigation.navigate('ResetPassword', { role, nationalId });
    }, 500);
  };

  return (
    <View style={styles.container}>
      <AppBackground />
      <AppHeader onLogoPress={() => navigation.navigate('Landing')} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.glassCard,
              isRTL && Platform.OS === 'web' ? ({ direction: 'rtl' } as object) : null,
            ]}
          >
            <View style={styles.panelHeader}>
              <AppText style={styles.title}>{t('forgotPassword.heading')}</AppText>
              <AppText style={styles.subtitle}>{t('forgotPassword.instructions')}</AppText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    isRTL && styles.labelRTL,
                    focusedField === 'id' && styles.labelFocused,
                  ]}
                >
                  {t('forgotPassword.nationalIdLabel')}
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    nationalIdInputStyle,
                    focusedField === 'id' && styles.inputFocused,
                  ]}
                  placeholder={t('forgotPassword.nationalIdPlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  value={nationalId}
                  onChangeText={handleNationalIdChange}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoCapitalize="none"
                  autoComplete="off"
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => setFocusedField((prev) => (prev === 'id' ? null : prev))}
                />
              </View>

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
              {message ? <AppText style={styles.successText}>{message}</AppText> : null}

              <AnimatedButton
                title={t('forgotPassword.sendCode')}
                onPress={handleSendCode}
                disabled={loading}
                loading={loading}
              />

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.navigate('Login', { role })}
                activeOpacity={0.7}
              >
                <AppText style={styles.backToLoginText}>{t('forgotPassword.backToLogin')}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppFooter>
        <View style={styles.logosContainer}>
          <TouchableOpacity
            style={styles.iauLogo}
            onPress={() => Linking.openURL('https://www.iau.edu.sa/en/about-us')}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../assets/iau-university.png')}
              style={styles.partnerLogoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.logoDivider} />
          <TouchableOpacity
            style={styles.vision2030Logo}
            onPress={() => Linking.openURL('https://www.vision2030.gov.sa/en')}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../assets/2030-vision.png')}
              style={styles.partnerLogoImage}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'web' ? 64 : spacing.md,
  },
  glassCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.35)'
      : colors.primary[100],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  panelHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animationKeyframes: gradientTextBgShiftKeyframes,
      animationDuration: '4s',
      animationTimingFunction: 'ease',
      animationIterationCount: 'infinite',
    }),
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.logo.chambray,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  labelRTL: {
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.white,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.dark,
    borderWidth: 1,
    borderColor: colors.logo.chambray,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.logo.chambray,
  },
  labelFocused: {
    fontWeight: typography.weights.bold,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successText: {
    color: colors.status.success,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backToLogin: {
    marginTop: spacing.md,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  backToLoginText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  logosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  iauLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDivider: {
    width: 1,
    height: isSmallScreen ? 25 : 30,
    backgroundColor: colors.text.secondary,
    opacity: 0.3,
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  vision2030Logo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLogoImage: {
    width: isSmallScreen ? 80 : 100,
    height: isSmallScreen ? 30 : 35,
    opacity: 0.9,
  },
});
