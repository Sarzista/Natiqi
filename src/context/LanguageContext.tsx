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
    'header.user': 'User',
    'header.brand': 'Natiqi',
    'header.tagline': 'Mind to Message',
  },
  ar: {
    'app.name': 'رسالة للعقل',
    'landing.welcome': 'مرحباً بك في رسالة للعقل',
    'landing.tagline': 'منصة متقدمة للتواصل عبر تخطيط الدماغ للرعاية الصحية',
    'landing.selectRole': 'اختر دورك للوصول إلى المنصة',
    'landing.admin': 'مدير النظام',
    'landing.specialist': 'أخصائي طبي',
    'landing.patient': 'مريض',
    'header.user': 'مستخدم',
    'header.brand': 'ناطيقي',
    'header.tagline': 'من الإشارة إلى العبارة',
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


