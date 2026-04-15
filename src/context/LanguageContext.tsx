/**
 * Language Context
 * Manages app language (Arabic/English)
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys (will be expanded)
const translations: Record<Language, Record<string, string>> = {
  en: {
    'app.name': 'Message to Mind',
    'landing.welcome': 'Welcome to Message to Mind',
    'landing.tagline': 'Advanced EEG Communication Platform for Healthcare',
    'landing.selectRole': 'Select your role to access the platform',
    'landing.admin': 'System Admin',
    'landing.specialist': 'Medical Specialist',
    'landing.patient': 'Patient',
    'landing.login': 'Login',
    'header.user': 'User',
    'header.brand': 'Natiqi',
    'header.tagline': 'Mind to Message',
    'login.welcome': 'Welcome',
    'login.subtitle.admin': 'Natiqi Admin Login',
    'login.subtitle.specialist': 'Natiqi Medical Login',
    'login.subtitle.recipient': 'Natiqi Recipient Login',
    'login.nationalIdLabel': 'National ID',
    'login.nationalIdPlaceholder': 'Enter your National ID',
    'login.passwordLabel': 'Password',
    'login.passwordPlaceholder': 'Enter your password',
    'login.forgotPassword': 'Forgot password?',
    'login.submit': 'Login',
    'login.signUpPrompt': "Don't have an account? Create one",
    'login.errorBothFields': 'Please enter both ID and password',
    'login.errorGeneric': 'Login failed. Please try again.',
    'login.verifyCode': 'Enter verification code',
    'forgotPassword.heading': 'Forgot Password?',
    'forgotPassword.instructions':
      'Enter your registered National ID to receive a verification code.',
    'forgotPassword.nationalIdLabel': 'Registered National ID',
    'forgotPassword.nationalIdPlaceholder': 'Enter your National ID',
    'forgotPassword.sendCode': 'Send verification code',
    'forgotPassword.backToLogin': 'Back to Login',
    'forgotPassword.errorEmpty': 'Please enter your National ID',
    'signup.subtitle': 'Enter your details to set up a new account.',
    'signup.fullNameLabel': 'Full Name',
    'signup.fullNamePlaceholder': 'Enter your full name',
    'signup.genderLabel': 'Gender',
    'signup.genderSelect': 'Select gender',
    'signup.genderMale': 'Male',
    'signup.genderFemale': 'Female',
    'signup.phoneLabel': 'Phone Number',
    'signup.phonePlaceholder': 'Enter your phone number',
    'signup.emailLabel': 'Email',
    'signup.emailPlaceholder': 'Enter your email',
    'signup.passwordPlaceholderCreate': 'Create a password',
    'signup.confirmPasswordLabel': 'Confirm Password',
    'signup.confirmPasswordPlaceholder': 'Confirm your password',
    'signup.createAccount': 'Create Account',
    'signup.backToLogin': 'Back to Login',
    'signup.errorFillAll': 'Please fill all fields.',
    'signup.errorPasswordMismatch': 'Passwords do not match.',
    'signup.errorGeneric': 'Registration failed. Please try again.',
    'signup.errorIdDuplicateHint':
      'That ID is already in the system from your first sign-up. You cannot register again. Use Login with the same National ID and the password from that first sign-up, then complete verification (tap "Enter verification code" on the login screen if you see a verify message).',
    'signup.confirmTitle': 'Create account',
    'signup.confirmMessage': 'This account will be registered as user.',
    'signup.confirmBack': 'Back',
    'signup.confirmProceed': 'Proceed',
    'verify.subtitle':
      'Enter the verification code we sent to enable your account.',
    'verify.devHintWithCode':
      'Dev only: your code is {code}. In production this would arrive by email or SMS.',
    'verify.devHintFlask':
      'Run the Flask backend on port 5000. With debug on, the code is printed in the terminal or returned after sign-up.',
    'verify.codeLabel': 'Verification Code',
    'verify.codePlaceholder': 'Enter the code',
    'verify.submit': 'Verify Account',
    'verify.resend': 'Resend code',
    'verify.backToLogin': 'Back to Login',
    'verify.errorMissingNationalId': 'Missing account ID. Go back and sign up again.',
    'verify.errorEmptyCode': 'Please enter the verification code.',
    'verify.successVerified': 'Account verified. You can now log in.',
    'verify.errorGeneric': 'Verification failed.',
    'verify.errorMissingNationalIdShort': 'Missing account ID.',
    'verify.errorResendFailed': 'Could not resend.',
    'verify.resendDevCodePrefix': ' (dev code: ',
    'verify.resendDevCodeClose': ')',
    'verify.resendCheckTerminal':
      'Check the Flask terminal for the code in debug mode.',
  },
  ar: {
    'app.name': 'رسالة للعقل',
    'landing.welcome': 'مرحباً بك في رسالة للعقل',
    'landing.tagline': 'منصة متقدمة للتواصل عبر تخطيط الدماغ للرعاية الصحية',
    'landing.selectRole': 'اختر دورك للوصول إلى المنصة',
    'landing.admin': 'مدير النظام',
    'landing.specialist': 'أخصائي طبي',
    'landing.patient': 'مريض',
    'landing.login': 'الدخول',
    'header.user': 'مستخدم',
    'header.brand': 'ناطيقي',
    'header.tagline': 'من الإشارة إلى العبارة',
    'login.welcome': 'أهلاً بك',
    'login.subtitle.admin': 'تسجيل دخول المشرف – ناطيقي',
    'login.subtitle.specialist': 'تسجيل دخول الطاقم الطبي – ناطيقي',
    'login.subtitle.recipient': 'تسجيل دخول المستفيد – ناطيقي',
    'login.nationalIdLabel': 'رقم الهوية',
    'login.nationalIdPlaceholder': 'أدخل رقم الهوية',
    'login.passwordLabel': 'كلمة المرور',
    'login.passwordPlaceholder': 'أدخل كلمة المرور',
    'login.forgotPassword': 'نسيت كلمة المرور؟',
    'login.submit': 'تسجيل الدخول',
    'login.signUpPrompt': 'ليس لديك حساب؟ أنشئ حساباً',
    'login.errorBothFields': 'الرجاء إدخال رقم الهوية وكلمة المرور',
    'login.errorGeneric': 'فشل تسجيل الدخول. حاول مرة أخرى.',
    'login.verifyCode': 'أدخل رمز التحقق',
    'forgotPassword.heading': 'نسيت كلمة المرور؟',
    'forgotPassword.instructions':
      'أدخل رقم الهوية المسجل لاستلام رمز التحقق.',
    'forgotPassword.nationalIdLabel': 'رقم الهوية المسجل',
    'forgotPassword.nationalIdPlaceholder': 'أدخل رقم الهوية',
    'forgotPassword.sendCode': 'إرسال رمز التحقق',
    'forgotPassword.backToLogin': 'العودة إلى تسجيل الدخول',
    'forgotPassword.errorEmpty': 'الرجاء إدخال رقم الهوية',
    'signup.subtitle': 'أدخل بياناتك لإنشاء حساب جديد.',
    'signup.fullNameLabel': 'الاسم الكامل',
    'signup.fullNamePlaceholder': 'أدخل اسمك الكامل',
    'signup.genderLabel': 'الجنس',
    'signup.genderSelect': 'اختر الجنس',
    'signup.genderMale': 'ذكر',
    'signup.genderFemale': 'أنثى',
    'signup.phoneLabel': 'رقم الجوال',
    'signup.phonePlaceholder': 'أدخل رقم الجوال',
    'signup.emailLabel': 'البريد الإلكتروني',
    'signup.emailPlaceholder': 'أدخل البريد الإلكتروني',
    'signup.passwordPlaceholderCreate': 'أنشئ كلمة مرور',
    'signup.confirmPasswordLabel': 'تأكيد كلمة المرور',
    'signup.confirmPasswordPlaceholder': 'أكد كلمة المرور',
    'signup.createAccount': 'إنشاء حساب',
    'signup.backToLogin': 'العودة إلى تسجيل الدخول',
    'signup.errorFillAll': 'الرجاء تعبئة جميع الحقول.',
    'signup.errorPasswordMismatch': 'كلمتا المرور غير متطابقتين.',
    'signup.errorGeneric': 'فشل التسجيل. حاول مرة أخرى.',
    'signup.errorIdDuplicateHint':
      'رقم الهوية مسجّل مسبقاً. لا يمكنك التسجيل مرة أخرى. استخدم تسجيل الدخول بنفس رقم الهوية وكلمة المرور من أول تسجيل، ثم أكمل التحقق (اضغط «أدخل رمز التحقق» في شاشة الدخول إن ظهرت رسالة التحقق).',
    'signup.confirmTitle': 'إنشاء حساب',
    'signup.confirmMessage': 'سيتم تسجيل هذا الحساب كمستخدم.',
    'signup.confirmBack': 'رجوع',
    'signup.confirmProceed': 'متابعة',
    'verify.subtitle': 'أدخل رمز التحقق الذي أرسلناه لتفعيل حسابك.',
    'verify.devHintWithCode':
      'للتجربة فقط: رمز التحقق هو {code}. في التطبيق الفعلي سيصلك عبر البريد الإلكتروني أو رسالة نصية.',
    'verify.devHintFlask':
      'شغّل خادم Flask على المنفذ 5000. مع وضع التصحيح، يُطبع الرمز في الطرفية أو يُعاد بعد التسجيل.',
    'verify.codeLabel': 'رمز التحقق',
    'verify.codePlaceholder': 'أدخل الرمز',
    'verify.submit': 'تفعيل الحساب',
    'verify.resend': 'إعادة إرسال الرمز',
    'verify.backToLogin': 'العودة إلى تسجيل الدخول',
    'verify.errorMissingNationalId': 'معرّف الحساب مفقود. ارجع وأكمل التسجيل من جديد.',
    'verify.errorEmptyCode': 'الرجاء إدخال رمز التحقق.',
    'verify.successVerified': 'تم التحقق من الحساب. يمكنك تسجيل الدخول الآن.',
    'verify.errorGeneric': 'فشل التحقق.',
    'verify.errorMissingNationalIdShort': 'معرّف الحساب مفقود.',
    'verify.errorResendFailed': 'تعذّر إعادة إرسال الرمز.',
    'verify.resendDevCodePrefix': ' (رمز التجربة: ',
    'verify.resendDevCodeClose': ')',
    'verify.resendCheckTerminal':
      'راجع نافذة Flask في وضع التصحيح لمعرفة الرمز.',
  },
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL: language === 'ar',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};


