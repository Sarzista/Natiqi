/**
 * Reusable screen container component
 * Provides consistent padding, background, and scrolling
 */
import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: object;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  style,
}) => {
  const containerStyle = [
    styles.container,
    style,
  ];

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: 'transparent',
  },
});

