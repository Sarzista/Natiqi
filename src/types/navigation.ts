/**
 * Navigation type definitions
 */
import { NavigatorScreenParams } from '@react-navigation/native';
import { UserRole } from '../screens/LandingScreen';

export type RootStackParamList = {
  Landing: undefined;
  Login: { role: UserRole };
  ForgotPassword: { role: UserRole };
  ResetPassword: { role: UserRole; nationalId?: string; devCode?: string };
  SignUp: { role: UserRole };
  VerifyAccount: {
    role: UserRole;
    email?: string;
    phone?: string;
    nationalId?: string;
    /** Filled in dev when API returns `dev_code` (do not rely on this in production) */
    devCode?: string;
  };
  Dashboard: undefined;
};

