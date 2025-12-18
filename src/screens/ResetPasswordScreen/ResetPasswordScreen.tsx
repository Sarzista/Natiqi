/**
 * Reset Password Screen - follows forgot password glass style
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

type ResetPasswordNavProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

interface ResetPasswordScreenProps {
  navigation: ResetPasswordNavProp;
  route: ResetPasswordRouteProp;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'code' | 'new' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const role: UserRole = route.params?.role || 'patient';
  const nationalId = route.params?.nationalId;

  const handleReset = () => {
    if (!verificationCode.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill all fields.');
      setMessage('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setMessage('Password updated. You can now log in.');
      // Optionally navigate back to login automatically after success
      // navigation.navigate('Login', { role });
    }, 800);
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
              <AppText style={styles.title}>Set New Password</AppText>
              <AppText style={styles.subtitle}>
                Enter the verification code and your new password to continue.
              </AppText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    focusedField === 'code' && styles.labelFocused,
                  ]}
                >
                  Verification Code
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'code' && styles.inputFocused,
                  ]}
                  placeholder="Enter the code"
                  placeholderTextColor={colors.text.muted}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('code')}
                  onBlur={() => setFocusedField((prev) => (prev === 'code' ? null : prev))}
                />
              </View>

              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    focusedField === 'new' && styles.labelFocused,
                  ]}
                >
                  New Password
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'new' && styles.inputFocused,
                  ]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.text.muted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('new')}
                  onBlur={() => setFocusedField((prev) => (prev === 'new' ? null : prev))}
                />
              </View>

              <View style={styles.inputContainer}>
                <AppText
                  style={[
                    styles.label,
                    focusedField === 'confirm' && styles.labelFocused,
                  ]}
                >
                  Confirm New Password
                </AppText>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'confirm' && styles.inputFocused,
                  ]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.text.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField((prev) => (prev === 'confirm' ? null : prev))}
                />
              </View>

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
              {message ? <AppText style={styles.successText}>{message}</AppText> : null}

              <AnimatedButton
                title="Reset password"
                onPress={handleReset}
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
  inputContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.logo.chambray,
    marginBottom: spacing.sm,
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


