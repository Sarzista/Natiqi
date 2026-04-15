/**
 * Login Screen with Glassmorphism Design
 * National ID + Password fields
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppBackground } from '../../components/AppBackground';
import { AnimatedButton } from '../../components/AnimatedButton';
import { AppHeader } from '../../components/AppHeader';
import { AppFooter } from '../../components/AppFooter';
import { AppText } from '../../components/AppText';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 600;
const PASSWORD_ICON_GUTTER = 48;


type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'id' | 'password' | null>(null);
  const { login } = useAuth();
  const { t, isRTL } = useLanguage();
  const role: UserRole = route.params?.role ?? 'RegisteredUser';

  const loginSubtitleKey =
    role === 'admin'
      ? 'login.subtitle.admin'
      : role === 'specialist'
        ? 'login.subtitle.specialist'
        : 'login.subtitle.recipient';

  const inputDirectionStyle = {
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    ...(Platform.OS !== 'web' && { writingDirection: (isRTL ? 'rtl' : 'ltr') as 'rtl' | 'ltr' }),
  };

  const nationalIdInputStyle = {
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    ...(Platform.OS !== 'web' && { writingDirection: 'ltr' as const }),
  };

  const handleNationalIdChange = (text: string) => {
    // Allow only digits and clamp to 10 characters
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setEmail(digitsOnly);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('login.errorBothFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password, role);
      // After successful login, always navigate to Dashboard
      // (even if already authenticated from a previous session)
      navigation.navigate('Dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('login.errorGeneric');
      setError(msg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Shared soft gradient + orb particles background */}
      <AppBackground />

      {/* Unified glass header (shared across app) */}
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
          {/* Glassmorphism card */}
          <View
            style={[
              styles.glassCard,
              isRTL && Platform.OS === 'web' ? ({ direction: 'rtl' } as object) : null,
            ]}
          >
            <View style={styles.header}>
              <AppText style={[styles.title, isRTL && styles.loginHeaderTextArabic]}>{t('login.welcome')}</AppText>
              <AppText style={[styles.subtitle, isRTL && styles.loginHeaderTextArabic]}>
                {t(loginSubtitleKey)}
              </AppText>
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
                  {t('login.nationalIdLabel')}
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    nationalIdInputStyle,
                    focusedField === 'id' && styles.inputFocused,
                  ]}
                  placeholder={t('login.nationalIdPlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  value={email}
                  onChangeText={handleNationalIdChange}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoCapitalize="none"
                  autoComplete="off"
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => setFocusedField((prev) => (prev === 'id' ? null : prev))}
                />
              </View>

              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    isRTL && styles.labelRTL,
                    focusedField === 'password' && styles.labelFocused,
                  ]}
                >
                  {t('login.passwordLabel')}
                </AppText>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      inputDirectionStyle,
                      isRTL
                        ? { paddingLeft: PASSWORD_ICON_GUTTER, paddingRight: spacing.md }
                        : { paddingRight: PASSWORD_ICON_GUTTER, paddingLeft: spacing.md },
                      focusedField === 'password' && styles.inputFocused,
                    ]}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={colors.text.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField((prev) => (prev === 'password' ? null : prev))}
                  />
                  <TouchableOpacity
                    style={[styles.passwordToggle, isRTL ? styles.passwordToggleRTL : styles.passwordToggleLTR]}
                    onPress={() => setShowPassword((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.forgotPasswordLink, isRTL && styles.forgotPasswordLinkRTL]}
                onPress={() => navigation.navigate('ForgotPassword', { role })}
                activeOpacity={0.8}
              >
                <AppText style={[styles.forgotPasswordText, isRTL && styles.forgotPasswordTextRTL]}>
                  {t('login.forgotPassword')}
                </AppText>
              </TouchableOpacity>

              {error ? (
                <AppText style={[styles.errorText, isRTL && styles.errorTextRTL]}>{error}</AppText>
              ) : null}

              {error && /verify|verification|تحقق|التحقق/i.test(error) && role === 'RegisteredUser' && email.trim().length > 0 ? (
                <TouchableOpacity
                  style={[styles.verifyAccountLink, isRTL && styles.verifyAccountLinkRTL]}
                  onPress={() =>
                    navigation.navigate('VerifyAccount', {
                      role,
                      nationalId: email.trim(),
                    })
                  }
                  activeOpacity={0.8}
                >
                  <AppText style={[styles.verifyAccountText, isRTL && styles.verifyAccountTextRTL]}>
                    {t('login.verifyCode')}
                  </AppText>
                </TouchableOpacity>
              ) : null}

              <AnimatedButton title={t('login.submit')} onPress={handleLogin} disabled={loading} loading={loading} />

              <TouchableOpacity
                style={styles.signUpLink}
                onPress={() => navigation.navigate('SignUp', { role })}
                activeOpacity={0.8}
              >
                <AppText style={[styles.signUpText, isRTL && styles.signUpPromptArabic]}>
                  {t('login.signUpPrompt')}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unified glass footer with partner logos */}
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
    paddingVertical: spacing.xl,
    paddingTop: Platform.OS === 'web' ? 120 : spacing.xl,
  },
  glassCard: {
    width: '90%',
    maxWidth: 400,
    // Glassy card similar to header: light, semi‑transparent, with blur on web
    backgroundColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    padding: spacing.xl,
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    ...(Platform.OS === 'web' && {
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }),
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  loginHeaderTextArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.logo.chambray,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorTextRTL: {
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  verifyAccountLink: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  verifyAccountLinkRTL: {
    alignSelf: 'flex-end',
  },
  verifyAccountText: {
    color: colors.logo.chambray,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  verifyAccountTextRTL: {
    textAlign: 'right',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  passwordToggleLTR: {
    right: spacing.md,
  },
  passwordToggleRTL: {
    left: spacing.md,
  },
  passwordToggleIcon: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
  },
  forgotPasswordLink: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  forgotPasswordLinkRTL: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: colors.logo.emerald,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  forgotPasswordTextRTL: {
    textAlign: 'right',
  },
  signUpLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  signUpText: {
    color: colors.logo.chambray,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  signUpPromptArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  // Visual chrome for the footer now comes from shared AppFooter.
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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

