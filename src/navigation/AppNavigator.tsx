/**
 * Main App Navigator
 * Handles navigation between Login and Dashboard screens
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { VerifyAccountScreen } from '../screens/VerifyAccountScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Linking configuration for web browser history
const linking: LinkingOptions<RootStackParamList> = Platform.OS === 'web' ? {
  prefixes: ['/'],
  config: {
    screens: {
      Landing: '/',
      Login: '/login',
      ForgotPassword: '/forgot-password',
      ResetPassword: '/reset-password',
      SignUp: '/signup',
      VerifyAccount: '/verify-account',
      Dashboard: '/dashboard',
    },
  },
} : undefined;

export const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    if (isAuthenticated && navigationRef.current?.isReady()) {
      // Only navigate to Dashboard if authenticated
      // Use navigate instead of reset to preserve browser history
      const currentRoute = navigationRef.current.getCurrentRoute();
      if (currentRoute?.name !== 'Dashboard') {
        navigationRef.current.navigate('Dashboard');
      }
    }
    // Don't reset to Login when not authenticated - let Landing be the initial screen
  }, [isAuthenticated]);

  return (
    <View style={styles.wrapper}>
      <NavigationContainer 
        ref={navigationRef}
        linking={linking}
        // Enable browser history integration on web
        {...(Platform.OS === 'web' && {
          documentTitle: {
            formatter: (_options, route) => {
              const routeName = route?.name || 'Landing';
              const pageLabel =
                routeName === 'Landing'
                  ? 'Home'
                  : routeName === 'Login'
                    ? 'Login'
                    : routeName === 'ForgotPassword'
                      ? 'Forgot Password'
                      : routeName === 'ResetPassword'
                        ? 'Reset Password'
                        : routeName === 'SignUp'
                        ? 'Sign Up'
                        : routeName === 'VerifyAccount'
                          ? 'Verify Account'
                          : routeName === 'Dashboard'
                            ? 'Dashboard'
                            : routeName;
              return `Natiqi - ${pageLabel}`;
            },
          },
        })}
        // Fallback to prevent white screen
        fallback={null}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
          initialRouteName="Landing"
        >
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

