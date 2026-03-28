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
import { UserRole } from '../LandingScreen';

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
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'id' | 'phone' | 'email' | 'password' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const role: UserRole = route.params?.role || 'patient';

  const handleNationalIdChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setNationalId(digitsOnly);
  };

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 15);
    setPhone(digitsOnly);
  };

  const handleSignUp = () => {
    if (!nationalId || !phone || !email || !password || !confirmPassword) {
      setError('Please fill all fields.');
      setMessage('');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    // Simulate account creation
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('VerifyAccount', { role, email, phone, nationalId });
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
          <View style={styles.glassCard}>
            <View style={styles.header}>
              <Image
                source={require('../../../assets/FullLogo_Transparent_NoBuffer.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <AppText style={styles.title}>Create Account</AppText>
              <AppText style={styles.subtitle}>
                Enter your details to set up a new account.
              </AppText>
            </View>

            <View style={styles.form}>
              <View style={[styles.row, isWide && styles.rowWide]}>
                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      focusedField === 'id' && styles.labelFocused,
                    ]}
                  >
                    National ID
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'id' && styles.inputFocused,
                    ]}
                    placeholder="Enter your National ID"
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
                      focusedField === 'phone' && styles.labelFocused,
                    ]}
                  >
                    Phone Number
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'phone' && styles.inputFocused,
                    ]}
                    placeholder="Enter your phone number"
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
                    focusedField === 'email' && styles.labelFocused,
                  ]}
                >
                  Email
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'email' && styles.inputFocused,
                  ]}
                  placeholder="Enter your email"
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

              <View style={[styles.row, isWide && styles.rowWide]}>
                <View style={[styles.inputContainer, isWide && styles.inputHalf]}>
                  <AppText
                    style={[
                      styles.label,
                      focusedField === 'password' && styles.labelFocused,
                    ]}
                  >
                    Password
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'password' && styles.inputFocused,
                    ]}
                    placeholder="Create a password"
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
                      focusedField === 'confirm' && styles.labelFocused,
                    ]}
                  >
                    Confirm Password
                  </AppText>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'confirm' && styles.inputFocused,
                    ]}
                    placeholder="Confirm your password"
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
                title="Create Account"
                onPress={handleSignUp}
                disabled={loading}
                loading={loading}
              />

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.navigate('Login', { role })}
                activeOpacity={0.7}
              >
                <AppText style={styles.backToLoginText}>Back to Login</AppText>
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
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: isSmallScreen ? 140 : 160,
    height: isSmallScreen ? 80 : 100,
    marginBottom: spacing.sm,
    transform: [{ scale: 1.5 }],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    ...(Platform.OS === 'web' && {
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'gradient-move 4s ease infinite',
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
  row: {
    width: '100%',
  },
  rowWide: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  backToLogin: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  backToLoginText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
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

