/**
 * Patient card component with hover/press animations
 * Displays patient information in a card format
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Patient } from '../../types';
import { AppText } from '../AppText';
import { colors, spacing, typography } from '../../theme';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface PatientCardProps {
  patient: Patient;
  onPress?: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onPress }) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.08);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOpacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98, {
      damping: 15,
      stiffness: 300,
    });
    shadowOpacity.value = withTiming(0.15, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    shadowOpacity.value = withTiming(0.08, { duration: 150 });
  };

  const getStatusColor = (status: Patient['status']) => {
    switch (status) {
      case 'stable':
        return colors.patient.stable;
      case 'critical':
        return colors.patient.critical;
      case 'warning':
        return colors.patient.warning;
      case 'monitoring':
        return colors.patient.monitoring;
      default:
        return colors.patient.stable;
    }
  };

  const CardContent = (
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText style={styles.name}>{patient.name}</AppText>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(patient.status) },
            ]}
          >
            <AppText style={styles.statusText}>{patient.status.toUpperCase()}</AppText>
          </View>
        </View>
        <View style={styles.details}>
          <AppText style={styles.room}>Room: {patient.roomNumber}</AppText>
          {patient.lastUpdate && (
            <AppText style={styles.update}>Updated: {patient.lastUpdate}</AppText>
          )}
        </View>
      </View>
  );

  if (onPress) {
    return (
      <AnimatedTouchableOpacity
        style={[styles.container, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        {CardContent}
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {CardContent}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text.white,
  },
  details: {
    marginTop: spacing.xs,
  },
  room: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  update: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
});

