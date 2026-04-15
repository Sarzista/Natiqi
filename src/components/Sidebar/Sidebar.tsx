/**
 * App Sidebar
 * Shared dashboard sidebar for all roles (light theme)
 * Uses Natiqi blue/green palette and EEG-focused wording.
 */
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { colors, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../types/navigation';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 900;

export type SidebarItemKey =
  | 'overview'
  | 'patients'
  | 'alerts'
  | 'settings'
  // Admin-specific
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-models'
  | 'admin-logs'
  | 'admin-settings'
  // Specialist-specific
  | 'spec-dashboard'
  | 'spec-patients'
  | 'spec-sessions'
  | 'spec-reports'
  | 'spec-settings'
  // Recipient (patient) specific
  | 'rec-dashboard'
  | 'rec-sessions'
  | 'rec-settings';

type SidebarVariant = 'default' | 'admin' | 'specialist' | 'recipient';

interface SidebarProps {
  activeItem: SidebarItemKey;
  onSelect: (key: SidebarItemKey) => void;
  roleLabel?: string; // e.g. "Clinician", "Patient", "Caregiver"
  variant?: SidebarVariant;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeItem,
  onSelect,
  roleLabel,
  variant = 'default',
}) => {
  const { logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigation.navigate('Landing');
    } finally {
      setLoggingOut(false);
    }
  };

  const items: { key: SidebarItemKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] =
    variant === 'admin'
      ? [
          { key: 'admin-dashboard', label: 'Dashboard', icon: 'home-outline' },
          { key: 'admin-users', label: 'Users', icon: 'people-outline' },
          { key: 'admin-models', label: 'Models', icon: 'cloud-upload-outline' },
          { key: 'admin-logs', label: 'Logs', icon: 'document-text-outline' },
          { key: 'admin-settings', label: 'Settings', icon: 'settings-outline' },
        ]
      : variant === 'specialist'
      ? [
          { key: 'spec-dashboard', label: 'Dashboard', icon: 'home-outline' },
          { key: 'spec-patients', label: 'Patients', icon: 'people-outline' },
          { key: 'spec-sessions', label: 'Sessions', icon: 'pulse-outline' },
          { key: 'spec-reports', label: 'Reports', icon: 'document-text-outline' },
          { key: 'spec-settings', label: 'Settings', icon: 'settings-outline' },
        ]
      : variant === 'recipient'
      ? [
          { key: 'rec-dashboard', label: 'Dashboard', icon: 'home-outline' },
          { key: 'rec-sessions', label: 'Sessions', icon: 'pulse-outline' },
          { key: 'rec-settings', label: 'Settings', icon: 'settings-outline' },
        ]
      : [
          { key: 'overview', label: 'Overview', icon: 'home-outline' },
          { key: 'patients', label: 'Patients', icon: 'people-outline' },
          { key: 'alerts', label: 'Alerts', icon: 'alert-circle-outline' },
          { key: 'settings', label: 'Settings', icon: 'settings-outline' },
        ];

  return (
    <View style={styles.container}>
      <View style={styles.topBlock}>
        {/* Role / context header */}
        <View style={styles.header}>
          <View style={styles.roleBadge}>
            <Ionicons
              name="pulse-outline"
              size={16}
              color={colors.logo.chambray}
            />
            <AppText style={styles.roleText}>
              {roleLabel || 'EEG Dashboard'}
            </AppText>
          </View>
          <AppText style={styles.subtitle}>
            Mind to Message status
          </AppText>
        </View>

        {/* Navigation items */}
        <View style={styles.navSection}>
          {items.map((item) => {
            const isActive = item.key === activeItem;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => onSelect(item.key)}
                activeOpacity={0.85}
              >
                <View style={styles.navItemInner}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? colors.logo.oceanGreen : colors.text.secondary}
                  />
                  <AppText
                    style={[
                      styles.navLabel,
                      isActive && styles.navLabelActive,
                    ]}
                  >
                    {item.label}
                  </AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        activeOpacity={0.85}
        disabled={loggingOut}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Ionicons name="log-out-outline" size={22} color={colors.status.error} />
        <AppText style={styles.logoutLabel}>{loggingOut ? 'Signing out…' : 'Log out'}</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: isSmallScreen ? 220 : 260,
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    // Glassmorphism-style background using Natiqi light mint/blue tones
    backgroundColor: 'rgba(220, 240, 232, 0.16)', // Swans Down with transparency
    borderRadius: 0, // flush edges, no rounded corners
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 24px 60px rgba(55, 93, 152, 0.25)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }
      : {
          shadowColor: colors.primary[900],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 8,
        }),
  },
  topBlock: {
    flexShrink: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: spacing.xs,
  },
  roleText: {
    marginLeft: spacing.xs,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  navSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  navItem: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55,93,152,0.08)',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  navItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  navLabelActive: {
    color: colors.logo.oceanGreen,
    fontWeight: typography.weights.bold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.status.error,
  },
});


