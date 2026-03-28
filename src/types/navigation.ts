/**
 * Navigation type definitions
 */
import { NavigatorScreenParams } from '@react-navigation/native';
import { UserRole } from '../screens/LandingScreen';

export type RootStackParamList = {
  Landing: undefined;
  Login: { role: UserRole };
  ForgotPassword: { role: UserRole };
  ResetPassword: { role: UserRole; nationalId?: string };
  SignUp: { role: UserRole };
  VerifyAccount: { role: UserRole; email?: string; phone?: string; nationalId?: string };
  Dashboard: undefined;
};

