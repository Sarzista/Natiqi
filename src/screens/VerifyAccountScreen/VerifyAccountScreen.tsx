/**
 * Verify Account Screen - compact glass card for account activation
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
import { colors, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';
import { UserRole } from '../../types';
import { verifyAccountCode, resendVerificationCode } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;

type VerifyNavProp = NativeStackNavigationProp<RootStackParamList, 'VerifyAccount'>;
type VerifyRouteProp = RouteProp<RootStackParamList, 'VerifyAccount'>;

interface VerifyAccountScreenProps {
  navigation: VerifyNavProp;
  route: VerifyRouteProp;
}

export const VerifyAccountScreen: React.FC<VerifyAccountScreenProps> = ({ navigation, route }) => {
  const { t, isRTL } = useLanguage();
  const [code, setCode] = useState('');
  const [focusedField, setFocusedField] = useState<'code' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const role: UserRole = route.params?.role ?? 'RegisteredUser';
  const nationalId = route.params?.nationalId?.trim() || '';
  const devCodeHint = route.params?.devCode;

  const textAlignCode = isRTL
    ? ({
        textAlign: 'right' as const,
        ...(Platform.OS !== 'web' && { writingDirection: 'ltr' as const }),
      })
    : { textAlign: 'left' as const };

  const handleVerify = async () => {
    if (!nationalId) {
      setError(t('verify.errorMissingNationalId'));
      setMessage('');
      return;
    }
    if (!code.trim()) {
      setError(t('verify.errorEmptyCode'));
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      await verifyAccountCode(nationalId, code.trim());
      setMessage(t('verify.successVerified'));
      navigation.navigate('Login', { role });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('verify.errorGeneric');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!nationalId) {
      setError(t('verify.errorMissingNationalIdShort'));
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const out = await resendVerificationCode(nationalId);
      setMessage(
        out.dev_code
          ? `${out.message}${t('verify.resendDevCodePrefix')}${out.dev_code}${t('verify.resendDevCodeClose')}`
          : `${out.message} ${t('verify.resendCheckTerminal')}`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('verify.errorResendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const devHintWithCodeText = t('verify.devHintWithCode').replace('{code}', String(devCodeHint ?? ''));

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
            <View style={styles.header}>
              <AppText style={[styles.subtitle, isRTL && styles.subtitleArabic]}>
                {t('verify.subtitle')}
              </AppText>
              {devCodeHint ? (
                <AppText style={[styles.devHint, isRTL && styles.devHintArabic]}>{devHintWithCodeText}</AppText>
              ) : (
                <AppText style={[styles.devHint, isRTL && styles.devHintArabic]}>
                  {t('verify.devHintFlask')}
                </AppText>
              )}
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    isRTL && styles.labelRTL,
                    focusedField === 'code' && styles.labelFocused,
                  ]}
                >
                  {t('verify.codeLabel')}
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    textAlignCode,
                    focusedField === 'code' && styles.inputFocused,
                  ]}
                  placeholder={t('verify.codePlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('code')}
                  onBlur={() => setFocusedField((prev) => (prev === 'code' ? null : prev))}
                />
              </View>

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
              {message ? <AppText style={styles.successText}>{message}</AppText> : null}

              <AnimatedButton title={t('verify.submit')} onPress={handleVerify} disabled={loading} loading={loading} />

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={loading}
                activeOpacity={0.7}
              >
                <AppText style={[styles.resendBtnText, isRTL && styles.linkTextArabic]}>{t('verify.resend')}</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.navigate('Login', { role })}
                activeOpacity={0.7}
              >
                <AppText style={[styles.backToLoginText, isRTL && styles.linkTextArabic]}>
                  {t('verify.backToLogin')}
                </AppText>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    alignSelf: 'stretch',
    width: '100%',
  },
  subtitleArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  devHint: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    alignSelf: 'stretch',
    width: '100%',
  },
  devHintArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
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
    padding: spacing.md,
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
  resendBtn: {
    marginTop: spacing.sm,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    paddingVertical: spacing.xs,
  },
  resendBtnText: {
    color: colors.logo.calypso,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
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
  linkTextArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
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
