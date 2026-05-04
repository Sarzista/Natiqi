/**
 * Sign Up Screen - glass style, wider layout with columns on wide screens
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
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { register } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';

const GENDER_OPTIONS = ['Male', 'Female'] as const;
type GenderValue = (typeof GENDER_OPTIONS)[number];

/** Soft slate from reference UI (~blue-grey, not heavy brand blue). */
const SOFT_SLATE = '#78909c';
const SOFT_SLATE_TEXT = '#607d8b';

const GENDER_ROW_ICON: Record<GenderValue, keyof typeof Ionicons.glyphMap> = {
  Male: 'male',
  Female: 'female',
};

function toTitleCaseWords(input: string): string {
  return input.replace(/\S+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;
const isWide = width >= 900;

type SignUpNavProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
type SignUpRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

interface SignUpScreenProps {
  navigation: SignUpNavProp;
  route: SignUpRouteProp;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
  const { t, isRTL } = useLanguage();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<GenderValue | null>(null);
  const [genderMenuOpen, setGenderMenuOpen] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<
    'name' | 'gender' | 'id' | 'phone' | 'email' | 'password' | 'confirm' | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmRecipientModalVisible, setConfirmRecipientModalVisible] = useState(false);

  const role: UserRole = route.params?.role ?? 'RegisteredUser';
  /** Recipient / Natiqi user sign-up (not admin or specialist). */
  const isRecipientSignUp = role !== 'admin' && role !== 'specialist';

  const genderDisplay = (g: GenderValue) =>
    g === 'Male' ? t('signup.genderMale') : t('signup.genderFemale');

  const textAlignNameEmailPass = isRTL
    ? ({
        textAlign: 'right' as const,
        ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
      })
    : { textAlign: 'left' as const };

  const textAlignDigits = isRTL
    ? ({
        textAlign: 'right' as const,
        ...(Platform.OS !== 'web' && { writingDirection: 'ltr' as const }),
      })
    : { textAlign: 'left' as const };

  const handleNationalIdChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setNationalId(digitsOnly);
  };

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    if (digitsOnly.length > 1 && !digitsOnly.startsWith('05')) return;
    setPhone(digitsOnly);
  };

  const handleNameChange = (text: string) => {
    setName(toTitleCaseWords(text));
  };

  const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getSignUpValidationError = (): string | null => {
    if (!name.trim() || !gender || !nationalId || !phone || !email || !password || !confirmPassword) {
      return t('signup.errorFillAll');
    }
    if (!isValidEmail(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (phone.length !== 10 || !phone.startsWith('05')) {
      return 'Phone number must be 10 digits and start with 05.';
    }
    if (password !== confirmPassword) {
      return t('signup.errorPasswordMismatch');
    }
    return null;
  };

  const handleCreateAccountPress = () => {
    const validationError = getSignUpValidationError();
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }
    setError('');
    setMessage('');
    if (isRecipientSignUp) {
      setConfirmRecipientModalVisible(true);
    } else {
      void performSignUp();
    }
  };

  const performSignUp = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const reg = await register(
        nationalId,
        name.trim(),
        phone,
        email,
        password,
        gender!,
      );

      setLoading(false);
      setMessage(reg.message);

      navigation.navigate('VerifyAccount', {
        role,
        email,
        phone,
        nationalId,
        devCode: reg.dev_code,
      });
    } catch (err: unknown) {
      setLoading(false);
      let msg = err instanceof Error ? err.message : t('signup.errorGeneric');
      if (/national id already registered/i.test(msg)) {
        msg += `\n\n${t('signup.errorIdDuplicateHint')}`;
      }
      setError(msg);
    }
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
          style={styles.scrollView}
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
                {t('signup.subtitle')}
              </AppText>
            </View>

            <View style={styles.form}>
              <View
                style={[
                  styles.row,
                  isWide && styles.rowWide,
                  isWide && isRTL && styles.rowWideRTL,
                  genderMenuOpen && styles.genderRowStackTop,
                ]}
              >
                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      isRTL && styles.labelRTL,
                      focusedField === 'name' && styles.labelFocused,
                    ]}
                  >
                    {t('signup.fullNameLabel')}
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      textAlignNameEmailPass,
                      focusedField === 'name' && styles.inputFocused,
                    ]}
                    placeholder={t('signup.fullNamePlaceholder')}
                    placeholderTextColor={colors.text.muted}
                    value={name}
                    onChangeText={handleNameChange}
                    autoCapitalize="words"
                    autoComplete="name"
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField((prev) => (prev === 'name' ? null : prev))}
                  />
                </View>

                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      isRTL && styles.labelRTL,
                      (focusedField === 'gender' || genderMenuOpen) && styles.labelFocused,
                    ]}
                  >
                    {t('signup.genderLabel')}
                  </AppText>
                  <View style={styles.genderDropdownWrap}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.input,
                        styles.dropdownTrigger,
                        isRTL && styles.dropdownTriggerRTL,
                        styles.genderDropdownTrigger,
                        (focusedField === 'gender' || genderMenuOpen) &&
                          styles.genderDropdownTriggerFocused,
                      ]}
                      onPress={() => {
                        setFocusedField('gender');
                        setGenderMenuOpen((open) => !open);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: genderMenuOpen }}
                    >
                      <AppText
                        style={[
                          gender ? styles.genderDropdownValue : styles.genderDropdownPlaceholder,
                          isRTL && styles.genderDropdownValueRTL,
                        ]}
                      >
                        {gender ? genderDisplay(gender) : t('signup.genderSelect')}
                      </AppText>
                      <View style={styles.genderCaret}>
                        <View
                          style={[
                            styles.genderCaretTriangle,
                            genderMenuOpen && styles.genderCaretTriangleOpen,
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                    {genderMenuOpen ? (
                      <View style={styles.genderDropdownPanel} pointerEvents="box-none">
                        <View style={styles.genderDropdownMenuCard}>
                          <View style={styles.genderDropdownArrowSlot} pointerEvents="none">
                            <View style={styles.genderDropdownArrow} />
                          </View>
                          {GENDER_OPTIONS.map((option, index) => (
                            <React.Fragment key={option}>
                              <TouchableOpacity
                                style={[
                                  styles.genderDropdownRow,
                                  isRTL && styles.genderDropdownRowRTL,
                                  gender === option && styles.genderDropdownRowActive,
                                ]}
                                onPress={() => {
                                  setGender(option);
                                  setGenderMenuOpen(false);
                                  setFocusedField(null);
                                }}
                                activeOpacity={0.65}
                              >
                                <AppText
                                  style={[
                                    styles.genderDropdownRowText,
                                    gender === option && styles.genderDropdownRowTextActive,
                                    isRTL && styles.genderDropdownRowTextRTL,
                                  ]}
                                >
                                  {genderDisplay(option)}
                                </AppText>
                                <Ionicons
                                  name={GENDER_ROW_ICON[option]}
                                  size={18}
                                  color={SOFT_SLATE}
                                  style={styles.genderDropdownRowIcon}
                                />
                              </TouchableOpacity>
                              {index < GENDER_OPTIONS.length - 1 ? (
                                <View style={styles.genderDropdownDivider} />
                              ) : null}
                            </React.Fragment>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={[styles.row, isWide && styles.rowWide, isWide && isRTL && styles.rowWideRTL]}>
                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
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
                      textAlignDigits,
                      focusedField === 'id' && styles.inputFocused,
                    ]}
                    placeholder={t('login.nationalIdPlaceholder')}
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

                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      isRTL && styles.labelRTL,
                      focusedField === 'phone' && styles.labelFocused,
                    ]}
                  >
                    {t('signup.phoneLabel')}
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      textAlignDigits,
                      focusedField === 'phone' && styles.inputFocused,
                    ]}
                    placeholder="05XXXXXXXX"
                    placeholderTextColor={colors.text.muted}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={15}
                    autoCapitalize="none"
                    autoComplete="tel"
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField((prev) => (prev === 'phone' ? null : prev))}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    isRTL && styles.labelRTL,
                    focusedField === 'email' && styles.labelFocused,
                  ]}
                >
                  {t('signup.emailLabel')}
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    textAlignDigits,
                    focusedField === 'email' && styles.inputFocused,
                  ]}
                  placeholder={t('signup.emailPlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField((prev) => (prev === 'email' ? null : prev))}
                />
              </View>

              <View style={[styles.row, isWide && styles.rowWide, isWide && isRTL && styles.rowWideRTL]}>
                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      isRTL && styles.labelRTL,
                      focusedField === 'password' && styles.labelFocused,
                    ]}
                  >
                    {t('login.passwordLabel')}
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      textAlignNameEmailPass,
                      focusedField === 'password' && styles.inputFocused,
                    ]}
                    placeholder={t('signup.passwordPlaceholderCreate')}
                    placeholderTextColor={colors.text.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField((prev) => (prev === 'password' ? null : prev))}
                  />
                </View>

                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      isRTL && styles.labelRTL,
                      focusedField === 'confirm' && styles.labelFocused,
                    ]}
                  >
                    {t('signup.confirmPasswordLabel')}
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      textAlignNameEmailPass,
                      focusedField === 'confirm' && styles.inputFocused,
                    ]}
                    placeholder={t('signup.confirmPasswordPlaceholder')}
                    placeholderTextColor={colors.text.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField((prev) => (prev === 'confirm' ? null : prev))}
                  />
                </View>
              </View>

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
              {message ? <AppText style={styles.successText}>{message}</AppText> : null}

              <AnimatedButton
                title={t('signup.createAccount')}
                onPress={handleCreateAccountPress}
                disabled={loading}
                loading={loading}
              />

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.navigate('Login', { role })}
                activeOpacity={0.7}
              >
                <AppText style={[styles.backToLoginText, isRTL && styles.backToLoginTextArabic]}>
                  {t('signup.backToLogin')}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={confirmRecipientModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmRecipientModalVisible(false)}
      >
        <Pressable
          style={styles.confirmOverlay}
          onPress={() => setConfirmRecipientModalVisible(false)}
        >
          <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation()}>
            <AppText style={styles.confirmCardTitle}>{t('signup.confirmTitle')}</AppText>
            <AppText style={[styles.confirmCardMessage, isRTL && styles.confirmCardMessageArabic]}>
              {t('signup.confirmMessage')}
            </AppText>
            <View style={[styles.confirmActions, isRTL && styles.confirmActionsRTL]}>
              <TouchableOpacity
                style={styles.confirmBtnBackOuter}
                onPress={() => setConfirmRecipientModalVisible(false)}
                activeOpacity={0.85}
              >
                <AppText style={styles.confirmBtnBackText}>{t('signup.confirmBack')}</AppText>
              </TouchableOpacity>
              <View style={styles.confirmBtnProceedOuter}>
                <AnimatedButton
                  title={t('signup.confirmProceed')}
                  onPress={() => {
                    setConfirmRecipientModalVisible(false);
                    void performSignUp();
                  }}
                  style={styles.confirmProceedAnimated}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  scrollView: {
    overflow: 'visible',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'web' ? 64 : spacing.md,
    overflow: 'visible',
  },
  glassCard: {
    width: '95%',
    maxWidth: isWide ? 560 : 420,
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
    overflow: 'visible',
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
  /** Keeps instructional line centered with natural RTL flow on native. */
  subtitleArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  form: {
    width: '100%',
    overflow: 'visible',
  },
  row: {
    width: '100%',
    overflow: 'visible',
  },
  rowWide: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowWideRTL: {
    flexDirection: 'row-reverse',
  },
  /** Whole row must stack above the next row (ID / phone) so the menu is not covered. */
  genderRowStackTop: {
    position: 'relative',
    zIndex: 20000,
    elevation: 60,
    overflow: 'visible',
    ...(Platform.OS === 'web' && { isolation: 'isolate' as const }),
  },
  inputHalf: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.logo.chambray,
    marginBottom: spacing.sm / 1,
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
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTriggerRTL: {
    flexDirection: 'row-reverse',
  },
  dropdownPlaceholder: {
    fontSize: typography.sizes.base,
    color: colors.text.muted,
  },
  dropdownValue: {
    fontSize: typography.sizes.base,
    color: colors.text.dark,
  },
  /** Soft glass selector (reference: light panel, slate accents, soft shadow). */
  genderDropdownTrigger: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 144, 156, 0.22)',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(252, 252, 253, 0.96)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow:
        '0 4px 14px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
    }),
  },
  genderDropdownTriggerFocused: {
    borderColor: 'rgba(120, 144, 156, 0.38)',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    ...(Platform.OS === 'web' && {
      boxShadow:
        '0 6px 18px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
    }),
  },
  genderDropdownPlaceholder: {
    fontSize: typography.sizes.base,
    color: SOFT_SLATE,
  },
  genderDropdownValue: {
    fontSize: typography.sizes.base,
    color: SOFT_SLATE_TEXT,
    fontWeight: typography.weights.medium,
  },
  genderDropdownValueRTL: {
    textAlign: 'right',
    flex: 1,
  },
  genderCaret: {
    width: 14,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderCaretTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: SOFT_SLATE,
  },
  genderCaretTriangleOpen: {
    transform: [{ rotate: '180deg' }],
  },
  genderDropdownWrap: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
    zIndex: 1,
  },
  genderDropdownPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: 10,
    zIndex: 20001,
    overflow: 'visible',
    alignItems: 'stretch',
  },
  genderDropdownMenuCard: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 144, 156, 0.2)',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.82)' : 'rgba(250, 251, 252, 0.98)',
    overflow: 'hidden',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 20,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow:
        '0 10px 28px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
    }),
  },
  genderDropdownArrowSlot: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    alignItems: 'center',
    height: 8,
    zIndex: 2,
  },
  genderDropdownArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.82)' : 'rgba(250, 251, 252, 0.98)',
  },
  genderDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  genderDropdownRowRTL: {
    flexDirection: 'row-reverse',
  },
  genderDropdownRowIcon: {
    marginHorizontal: spacing.sm,
    opacity: 0.9,
  },
  genderDropdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(120, 144, 156, 0.2)',
  },
  genderDropdownRowActive: {
    backgroundColor: 'rgba(120, 144, 156, 0.07)',
  },
  genderDropdownRowText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: SOFT_SLATE_TEXT,
    fontWeight: typography.weights.medium,
  },
  genderDropdownRowTextActive: {
    fontWeight: typography.weights.semibold,
    color: SOFT_SLATE_TEXT,
  },
  genderDropdownRowTextRTL: {
    textAlign: 'right',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  confirmCard: {
    width: '100%',
    maxWidth: isWide ? 560 : 420,
    backgroundColor: Platform.OS === 'web'
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    padding: spacing.lg,
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
  confirmCardTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
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
  confirmCardMessage: {
    fontSize: typography.sizes.base,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  confirmCardMessageArabic: {
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  confirmActionsRTL: {
    flexDirection: 'row-reverse',
  },
  confirmBtnBackOuter: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.logo.chambray,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }),
  },
  confirmBtnBackText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.logo.chambray,
  },
  confirmBtnProceedOuter: {
    flex: 1,
    justifyContent: 'center',
  },
  confirmProceedAnimated: {
    marginTop: 0,
    width: '100%',
    minHeight: 48,
    paddingVertical: spacing.md,
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
  backToLoginTextArabic: {
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

