/**
 * Logo + brand title + tagline row — same layout and Arabic RTL rules as the landing hero.
 * Used by AppHeader (compact) and LandingScreen (hero) so behavior stays identical.
 */
import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Logo, LogoVariant } from '../Logo';
import { AppText } from '../AppText';
import { useLanguage } from '../../context/LanguageContext';
import { spacing } from '../../theme';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;

export type HeaderBrandClusterProps = {
  brand: string;
  tagline: string;
  titleStyle: StyleProp<TextStyle>;
  taglineStyle: StyleProp<TextStyle>;
  logoSize?: 'small' | 'medium' | 'large' | 'xlarge' | number;
  logoVariant?: LogoVariant;
  logo?: ReactNode;
  showLogo?: boolean;
  onPress?: () => void;
  /** Landing centers the pair; the app bar aligns it to the start of the header area */
  rowJustifyContent?: 'flex-start' | 'center';
  rowStyle?: StyleProp<ViewStyle>;
  skipLanguageFont?: boolean;
};

export const HeaderBrandCluster: React.FC<HeaderBrandClusterProps> = ({
  brand,
  tagline,
  titleStyle,
  taglineStyle,
  logoSize = 'medium',
  logoVariant = 'icon',
  logo: customLogo,
  showLogo = true,
  onPress,
  rowJustifyContent = 'center',
  rowStyle,
  skipLanguageFont = false,
}) => {
  const { isRTL } = useLanguage();
  const hasCustomLogo = !!customLogo;

  const defaultLogo =
    showLogo && !hasCustomLogo ? (
      <Logo
        variant={logoVariant}
        background="transparent"
        size={logoSize}
        style={isRTL ? styles.logoRtl : undefined}
      />
    ) : null;

  const logoBlock =
    hasCustomLogo && customLogo ? (
      isRTL ? <View style={styles.logoRtl}>{customLogo}</View> : customLogo
    ) : (
      defaultLogo
    );

  const textColumn = (
    <View style={[styles.brandTextColumn, isRTL && styles.brandTextColumnRtl]}>
      <AppText
        style={[styles.titleAlign, isRTL && styles.titleAlignRtl, titleStyle]}
        skipLanguageFont={skipLanguageFont}
      >
        {brand}
      </AppText>
      <AppText
        style={[styles.taglineAlign, isRTL && styles.taglineAlignRtl, taglineStyle]}
        skipLanguageFont={skipLanguageFont}
      >
        {tagline}
      </AppText>
    </View>
  );

  const row = (
    <View
      style={[
        styles.brandRow,
        { justifyContent: rowJustifyContent },
        isRTL && styles.brandRowRtl,
        rowStyle,
      ]}
    >
      {logoBlock}
      {textColumn}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {row}
      </TouchableOpacity>
    );
  }

  return row;
};

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.lg,
  },
  brandRowRtl: {
    flexDirection: 'row-reverse',
  },
  logoRtl: {
    transform: [{ scaleX: -1 }],
  },
  brandTextColumn: {
    flexDirection: 'column',
    alignItems: isSmallScreen ? 'center' : 'flex-start',
  },
  brandTextColumnRtl: {
    alignItems: isSmallScreen ? 'center' : 'flex-end',
  },
  titleAlign: {
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  titleAlignRtl: {
    textAlign: isSmallScreen ? 'center' : 'right',
    paddingBottom: 4,
  },
  taglineAlign: {
    textAlign: isSmallScreen ? 'center' : 'left',
  },
  taglineAlignRtl: {
    textAlign: isSmallScreen ? 'center' : 'right',
  },
});
