/**
 * Custom Text component with text selection disabled by default
 * Use selectable prop to enable selection when needed
 */
import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

interface AppTextProps extends TextProps {
  selectable?: boolean;
  /** When true, do not apply the Arabic Tajawal font even if language is 'ar' (e.g. for header to keep sizing identical). */
  skipLanguageFont?: boolean;
  children: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  selectable = false,
  skipLanguageFont = false,
  style,
  ...props
}) => {
  const { language } = useLanguage();
  const fontFamily = !skipLanguageFont && language === 'ar' ? 'Tajawal_500Medium' : undefined;

  return (
    <Text
      selectable={selectable}
      style={[
        styles.default,
        fontFamily ? { fontFamily } : null,
        style,
      ]}
      {...props}
    >
      {props.children}
    </Text>
  );
};

const styles = StyleSheet.create({
  default: {
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
    }),
  },
});
