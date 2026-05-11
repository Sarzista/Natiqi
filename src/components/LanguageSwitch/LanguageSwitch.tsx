/**
 * Header controls: language toggle; optional notification bell (dashboard/auth flows).
 * - Language: toggles EN/AR on tap
 * - Notifications: recipient bell + list (omit on Landing via `showNotifications={false}`)
 */
import React from 'react';
import { View, StyleSheet, Pressable, Dimensions, Platform, Modal, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import GlobeSvg from '../../../assets/globe.svg';
import NotificationBellSvg from '../../../assets/alarm_alert_bell_notification_ring_icon_123294.svg';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';
import {
  fetchNotifications,
  markAllNotificationsSeen,
  markNotificationSeen,
  type NotificationRow,
} from '../../services/notificationService';
import { AppText } from '../AppText';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 600;

/** Hide scrollbars while keeping scroll (web + native indicator off). */
const scrollHideScrollbar = Platform.select({
  web: {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
  },
  default: {},
});

const GlobeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = isSmallScreen ? 24 : 26,
  color = colors.logo.chambray,
}) => (
  <GlobeSvg width={size} height={size} fill={color} />
);

const NotificationIcon: React.FC<{ size?: number; color?: string }> = ({
  size = isSmallScreen ? 24 : 26,
  color = colors.logo.chambray,
}) => (
  <NotificationBellSvg width={size} height={size} fill={color} />
);

type WebPressableState = { pressed: boolean; hovered?: boolean };

function pressableHovered(state: WebPressableState): boolean {
  return Platform.OS === 'web' && Boolean(state.hovered);
}

export interface LanguageSwitchProps {
  /** When false, hides bell, popover, and polling. Default false (opt in on dashboard). */
  showNotifications?: boolean;
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  showNotifications = false,
}) => {
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();

  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifItems, setNotifItems] = React.useState<NotificationRow[]>([]);
  const [notifUnseen, setNotifUnseen] = React.useState(0);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifError, setNotifError] = React.useState<string | null>(null);
  const [notifMarkAllBusy, setNotifMarkAllBusy] = React.useState(false);

  const nationalId = String(user?.id || '').trim();
  const authRole = user?.role ?? 'RegisteredUser';
  const roleUsesInAppNotifications =
    authRole === 'RegisteredUser' ||
    authRole === 'patient' ||
    authRole === 'specialist';

  const handleLanguagePress = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const refreshNotifications = React.useCallback(async () => {
    if (!nationalId || !roleUsesInAppNotifications) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await fetchNotifications({ national_id: nationalId, limit: 50, offset: 0 });
      setNotifItems(res.items || []);
      setNotifUnseen(res.unseen_count || 0);
    } catch (e: unknown) {
      setNotifError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setNotifLoading(false);
    }
  }, [nationalId, roleUsesInAppNotifications]);

  React.useEffect(() => {
    if (!showNotifications) return;
    if (!nationalId || !roleUsesInAppNotifications) return;
    refreshNotifications().catch(() => undefined);
    const id = setInterval(() => {
      refreshNotifications().catch(() => undefined);
    }, 5000);
    return () => clearInterval(id);
  }, [showNotifications, nationalId, roleUsesInAppNotifications, refreshNotifications]);

  const handleNotificationsPress = () => {
    if (!nationalId || !roleUsesInAppNotifications) return;
    setNotifOpen(true);
    refreshNotifications().catch(() => undefined);
  };

  const markSeen = async (n: NotificationRow) => {
    if (!nationalId) return;
    if (n.seen) return;
    try {
      const res = await markNotificationSeen({ national_id: nationalId, notification_id: n.notification_id });
      setNotifItems((prev) =>
        prev.map((x) => (x.notification_id === n.notification_id ? { ...x, seen: true } : x)),
      );
      setNotifUnseen(res.unseen_count || 0);
    } catch (e) {
      // keep silent in UI for now
    }
  };

  const markAllSeen = async () => {
    if (!nationalId || notifUnseen <= 0 || notifMarkAllBusy) return;
    setNotifMarkAllBusy(true);
    setNotifError(null);
    try {
      const res = await markAllNotificationsSeen({ national_id: nationalId });
      setNotifItems((prev) => prev.map((x) => ({ ...x, seen: true })));
      setNotifUnseen(res.unseen_count ?? 0);
    } catch (e: unknown) {
      setNotifError(e instanceof Error ? e.message : 'Failed to mark all as seen');
    } finally {
      setNotifMarkAllBusy(false);
    }
  };

  const formatNotifFooter = (n: NotificationRow) => {
    const timeLabel = n.event_time
      ? new Date(n.event_time).toLocaleString('en-GB', { hour12: false })
      : '—';
    const confLabel = n.confidence != null ? `${Math.round(n.confidence * 100)}%` : '—';
    return `${timeLabel} • ${confLabel}`;
  };

  return (
    <View style={styles.container}>
      {/* Language icon */}
      <Pressable
        onPress={handleLanguagePress}
        style={(state) => {
          const s = state as WebPressableState;
          return [
            styles.iconButton,
            (pressableHovered(s) || s.pressed) && styles.iconButtonHovered,
          ];
        }}
      >
        {(state) => {
          const s = state as WebPressableState;
          const isActive = pressableHovered(s) || s.pressed;
          const baseColor =
            language === 'ar' ? colors.primary[600] : colors.logo.chambray;
          const color = isActive ? colors.primary[600] : baseColor;

          return (
            <GlobeIcon
          size={isSmallScreen ? 24 : 26}
              color={color}
        />
          );
        }}
      </Pressable>

      {showNotifications ? (
        <>
          <Pressable
            onPress={handleNotificationsPress}
            style={(state) => {
              const s = state as WebPressableState;
              return [
                styles.iconButton,
                (pressableHovered(s) || s.pressed) && styles.iconButtonHovered,
              ];
            }}
          >
            {(state) => {
              const s = state as WebPressableState;
              const isActive = pressableHovered(s) || s.pressed;
              const color = isActive ? colors.primary[600] : colors.logo.chambray;

              return (
                <View style={styles.notifIconWrap}>
                  <NotificationIcon size={isSmallScreen ? 24 : 26} color={color} />
                  {roleUsesInAppNotifications && notifUnseen > 0 ? (
                    <View style={styles.notifBadge}>
                      <AppText style={styles.notifBadgeText} skipLanguageFont>
                        {notifUnseen > 99 ? '99+' : String(notifUnseen)}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              );
            }}
          </Pressable>

          <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={() => setNotifOpen(false)}>
            <Pressable style={styles.notifBackdrop} onPress={() => setNotifOpen(false)}>
              <Pressable style={styles.notifCard} onPress={() => undefined}>
                <View style={styles.notifHeaderRow}>
                  <AppText style={styles.notifTitle}>Notifications</AppText>
                  <Pressable
                    style={[styles.notifClose, (notifUnseen <= 0 || notifMarkAllBusy) && styles.notifCloseDisabled]}
                    onPress={markAllSeen}
                    disabled={notifUnseen <= 0 || notifMarkAllBusy}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all notifications as seen"
                  >
                    <AppText style={styles.notifCloseText}>
                      {notifMarkAllBusy ? 'Marking…' : 'Mark all'}
                    </AppText>
                  </Pressable>
                </View>

                {notifLoading ? (
                  <AppText style={styles.notifMeta}>Loading…</AppText>
                ) : notifError ? (
                  <AppText style={[styles.notifMeta, { color: colors.status.error }]}>{notifError}</AppText>
                ) : (
                  <ScrollView
                    style={[styles.notifList, scrollHideScrollbar]}
                    contentContainerStyle={{ paddingBottom: spacing.sm }}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  >
                    {notifItems.length === 0 ? (
                      <AppText style={styles.notifMeta}>No notifications yet.</AppText>
                    ) : (
                      notifItems.map((n) => (
                        <Pressable
                          key={String(n.notification_id)}
                          style={[styles.notifItem, !n.seen && styles.notifItemUnseen]}
                          onPress={() => markSeen(n)}
                        >
                          <AppText style={styles.notifWord}>{n.detected_word}</AppText>
                          <AppText style={styles.notifFooter}>{formatNotifFooter(n)}</AppText>
                          <View style={styles.notifSeenRow}>
                            <AppText style={styles.notifSeenText}>{n.seen ? 'Seen' : 'Mark as seen'}</AppText>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                )}
              </Pressable>
            </Pressable>
          </Modal>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  iconButtonHovered: {
    transform: [{ scale: 1.08 }],
  },
  notifIconWrap: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 5,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  notifBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: colors.text.white,
    textAlign: 'center',
  },
  notifBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 74, 122, 0.45)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 74,
    paddingRight: spacing.lg,
  },
  notifCard: {
    width: 360,
    borderRadius: 16,
    backgroundColor: colors.background.dark,
    borderWidth: 1.5,
    borderColor: 'rgba(58, 171, 131, 0.4)',
    padding: spacing.md,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: `0 16px 48px rgba(26, 46, 82, 0.55), 0 0 0 1px rgba(71, 190, 127, 0.2)`,
    } as any),
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 216, 179, 0.35)',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.logo.swansDown,
    letterSpacing: 0.2,
  },
  notifClose: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  notifCloseDisabled: {
    opacity: 0.45,
  },
  notifCloseText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.white,
  },
  notifMeta: {
    fontSize: 12,
    color: colors.logo.rockBlue,
    paddingVertical: spacing.xs,
  },
  notifList: {
    maxHeight: 5 * 64,
  },
  notifItem: {
    borderRadius: 12,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(161, 181, 206, 0.35)',
    marginBottom: spacing.xs,
  },
  notifItemUnseen: {
    borderColor: colors.primary[400],
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[400],
    backgroundColor: 'rgba(71, 190, 127, 0.18)',
  },
  notifWord: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text.white,
  },
  notifFooter: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.logo.vistaBlue,
  },
  notifSeenRow: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(58, 171, 131, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(148, 216, 179, 0.45)',
  },
  notifSeenText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.logo.swansDown,
  },
});
