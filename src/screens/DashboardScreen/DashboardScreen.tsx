/**
 * Dashboard Screen
 * Displays dashboards for different roles.
 * - Clinician/Admin: patient overview list
 * - Patient: personal EEG communication dashboard
 */
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Animated,
  Easing,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedRe, {
  Easing as ReEasing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '../../components/AppHeader';
import { PatientCard } from '../../components/PatientCard';
import { AppText } from '../../components/AppText';
import { Sidebar, type SidebarItemKey } from '../../components/Sidebar/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Logo } from '../../components/Logo/Logo';
import { AnimatedGradient } from '../../components/AnimatedGradient';
import { AppBackground } from '../../components/AppBackground';
import { CalendarDateField } from '../../components/CalendarDateField';
import { EegMiniChart } from '../../components/EegMiniChart';
import { Patient, UserRole } from '../../types';
import { RootStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';
import { getPatients, addPatient, deletePatient } from '../../services/patientService';
import { getUsers, addUser, deleteUser } from '../../services/userService';
import {
  fetchCurrentModel,
  fetchAdminModels,
  saveCurrentModel,
  type AdminModelRow,
} from '../../services/modelAdminService';
import { predictEegWindow, predictLiveDemo, type EegPredictWindowResponse } from '../../services/eegModelService';
import { fetchModelArtifactStatus, type ModelArtifactStatus } from '../../services/modelArtifactService';
import {
  createNotificationEvent,
  fetchSpecialistPatientNotifications,
  type SpecialistPatientNotificationRow,
} from '../../services/notificationService';
import {
  fetchSpecialistSessions,
  createEegSessionFromWindow,
  createLiveDemoSession,
  fetchLiveDemoSessionReport,
  liveDemoSessionReportCsvUrl,
  liveDemoSessionReportXlsxUrl,
  type LiveDemoSessionReport,
  type EegSessionRow,
} from '../../services/sessionService';
import {
  fetchPatientSettings,
  savePatientSettings,
  changePatientPassword,
  type PatientSettings,
} from '../../services/patientSettingsService';
import { getApiBase } from '../../config/apiBase';
import { Audio } from 'expo-av';

/** Mirrors backend `_notification_word_enabled` (Alerts & safety toggles). */
function patientNotifyToggleOn(settings: PatientSettings, detectedWord: string): boolean {
  const w = detectedWord.trim();
  if (!w || w === '—') return false;
  if (w === 'جوع') return settings.notify_hunger;
  if (w === 'عطش') return settings.notify_thirst;
  // if (w === 'انذار' || w === 'إنذار') return settings.notify_alarm;
  if (w === 'حمام') return settings.notify_bathroom;
  if (w === 'دواء') return settings.notify_medicine;
  return false;
}

/** Bell rules: toggled word + confidence ≥ saved minimum (same as `/notifications/event`). */
function patientBellEligible(settings: PatientSettings | null | undefined, detectedWord: string, confidence: number): boolean {
  if (!settings) return true;
  if (!patientNotifyToggleOn(settings, detectedWord)) return false;
  const minc = Number(settings.min_confidence);
  if (!Number.isFinite(minc)) return true;
  return confidence >= minc;
}

const EEG_HIGH_CONF_ALERT_THRESHOLD = 0.7;
const EEG_ALERT_ICON_SLOT = 56;

/** Care sentence under confidence when ≥70% (live demo + full Saved_Model vocab; alarm accepts إنذار/انذار). */
function liveDemoHighConfSentenceAr(arRaw: string): string {
  const ar = (arRaw || '').trim();
  const map: Record<string, string> = {
    جوع: 'المريض بحاجة إلى الطعام',
    عطش: 'المريض بحاجة إلى شرب الماء',
    حمام: 'المريض بحاجة لاستخدام دورة المياه',
    دواء: 'المريض بحاجة إلى تناول الدواء',
    // إنذار: 'توجد حالة طارئة تستدعي الانتباه',
    // انذار: 'توجد حالة طارئة تستدعي الانتباه',
  };
  return map[ar] ?? '';
}

/** English gloss for `DEMO_CLASS_NAMES` in `backend/ml/eeg_rf_4word_demo.py`. */
function eegDemoWordEnglish(arRaw: string): string {
  const ar = (arRaw || '').trim();
  const map: Record<string, string> = {
    جوع: 'Hunger',
    عطش: 'Thirst',
    حمام: 'Bathroom',
    دواء: 'Medicine',
    // إنذار: 'Alarm',
  };
  return map[ar] ?? '';
}

function translateWord(arWord: string, isRTL: boolean): string {
  if (!arWord || arWord === '—') return arWord;
  if (isRTL) return arWord; // already Arabic
  const map: Record<string, string> = {
    جوع: 'Hunger',
    عطش: 'Thirst',
    حمام: 'Bathroom',
    دواء: 'Medicine',
  };
  return map[arWord.trim()] || arWord;
}

type EegHighConfAlertEvent = { ts: number; confidence: number };

const EEG_HIGH_CONF_ALERT_LOG_KEY = 'eeg:high_conf_alert_events';
const EEG_HIGH_CONF_LOG_KEEP_MS = 10 * 24 * 60 * 60 * 1000;
const EEG_HIGH_CONF_LOG_MAX = 3000;

function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function readHighConfAlertsTodayCount(): Promise<number> {
  const startDay = startOfLocalDayMs();
  try {
    const raw = await AsyncStorage.getItem(EEG_HIGH_CONF_ALERT_LOG_KEY);
    const arr: EegHighConfAlertEvent[] = raw ? JSON.parse(raw) : [];
    return arr.filter(
      (e) =>
        e &&
        typeof e.ts === 'number' &&
        typeof e.confidence === 'number' &&
        e.confidence >= EEG_HIGH_CONF_ALERT_THRESHOLD &&
        e.ts >= startDay,
    ).length;
  } catch {
    return 0;
  }
}

/** Append one ≥70% alert and return how many such events occurred since local midnight. */
async function appendHighConfAlertEvent(confidence: number): Promise<number> {
  const now = Date.now();
  const startDay = startOfLocalDayMs();
  let arr: EegHighConfAlertEvent[] = [];
  try {
    const raw = await AsyncStorage.getItem(EEG_HIGH_CONF_ALERT_LOG_KEY);
    arr = raw ? (JSON.parse(raw) as EegHighConfAlertEvent[]) : [];
  } catch {
    arr = [];
  }
  arr = arr.filter((e) => e && typeof e.ts === 'number' && now - e.ts <= EEG_HIGH_CONF_LOG_KEEP_MS);
  arr.push({ ts: now, confidence });
  if (arr.length > EEG_HIGH_CONF_LOG_MAX) {
    arr = arr.slice(-EEG_HIGH_CONF_LOG_MAX);
  }
  await AsyncStorage.setItem(EEG_HIGH_CONF_ALERT_LOG_KEY, JSON.stringify(arr));
  return arr.filter(
    (e) =>
      typeof e.confidence === 'number' &&
      e.confidence >= EEG_HIGH_CONF_ALERT_THRESHOLD &&
      e.ts >= startDay,
  ).length;
}

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 960;
/** Match Landing hero brand text alignment (center vs start/end). */
const isNarrowHeaderBrand = width < 600;
const HEADER_HEIGHT_WEB = 80;
const SIDEBAR_BASE_WIDTH = isSmallScreen ? 220 : 260;


type AdminSettingsState = {
  emailNotifications: boolean;
  newUserRegistrationAlert: boolean;
  systemAlerts: boolean;
  lowAccuracyWarning: boolean;
  highErrorRate: boolean;
  maintenanceMode: boolean;
  sessionTimeoutMinutes: string;
  passwordExpiryDays: string;
  twoFactorAuth: boolean;
  dataRetentionDays: string;
  backupFrequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly';
  autoBackup: boolean;
};



const INITIAL_ADMIN_SETTINGS: AdminSettingsState = {
  emailNotifications: true,
  newUserRegistrationAlert: true,
  systemAlerts: true,
  lowAccuracyWarning: true,
  highErrorRate: false,
  maintenanceMode: false,
  sessionTimeoutMinutes: '30',
  passwordExpiryDays: '90',
  twoFactorAuth: true,
  dataRetentionDays: '365',
  backupFrequency: 'Daily',
  autoBackup: true,
};

/** Specialist-only clinical prefs (UI state until a clinician settings API exists). */
type SpecialistMedicalSettingsState = {
  emailNotifications: boolean;
  sessionSummaryAlerts: boolean;
  lowAccuracyWarning: boolean;
  criticalPatientAlerts: boolean;
};

const INITIAL_SPECIALIST_MEDICAL_SETTINGS: SpecialistMedicalSettingsState = {
  emailNotifications: true,
  sessionSummaryAlerts: true,
  lowAccuracyWarning: true,
  criticalPatientAlerts: true,
};

const MenuBurgerIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = colors.text.primary,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
  >
    <Path
      d="M480,224H32c-17.673,0-32,14.327-32,32s14.327,32,32,32h448c17.673,0,32-14.327,32-32S497.673,224,480,224z"
      fill={color}
    />
    <Path
      d="M32,138.667h448c17.673,0,32-14.327,32-32s-14.327-32-32-32H32c-17.673,0-32,14.327-32,32S14.327,138.667,32,138.667z"
      fill={color}
    />
    <Path
      d="M480,373.333H32c-17.673,0-32,14.327-32,32s14.327,32,32,32h448c17.673,0,32-14.327,32-32S497.673,373.333,480,373.333z"
      fill={color}
        />
  </Svg>
  );

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

function formatPredictedWord(arWord: string, isRTL = false): string {
  const map: Record<string, string> = {
    جوع: isRTL ? 'جوع' : 'Hunger (جوع)',
    عطش: isRTL ? 'عطش' : 'Thirst (عطش)',
    حمام: isRTL ? 'حمام' : 'Bathroom (حمام)',
    دواء: isRTL ? 'دواء' : 'Medicine (دواء)',
  };
  const w = (arWord || '').trim();
  return map[w] ?? (w || '—');
}

function downloadTableAsXlsx(rows: Record<string, string | number>[], filename: string): void {
  if (Platform.OS !== 'web') return;

  const headers = Object.keys(rows[0] ?? {});
  const esc = (v: string | number) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const csvLines = [
    headers.map((h) => `"${esc(h)}"`).join(','),
    ...rows.map((row) => headers.map((h) => `"${esc(row[h] ?? '')}"`).join(',')),
  ];

  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  // @ts-ignore
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.csv';
  // @ts-ignore
  document.body.appendChild(a);
  a.click();
  // @ts-ignore
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sessionListTopWord(s: EegSessionRow, isRTL = false): string {
  const word = (s.top_predicted_word ?? s.detected_word) || '—';
  return translateWord(word, isRTL);
}

function sessionListTopWordAvgAcc(s: EegSessionRow): string {
  if (s.top_predicted_word_avg_confidence != null) {
    return `${Math.round(s.top_predicted_word_avg_confidence * 100)}%`;
  }
  if (s.confidence_level != null) {
    return `${Math.round(s.confidence_level * 100)}%`;
  }
  return '—';
}

/** When the session report was saved: prefer `end_time`, else `start_time` (24h). */
function sessionListSavedDateTime(s: EegSessionRow): string {
  const iso = (s.end_time || s.start_time || '').trim();
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

/** Demo rows for specialist home KPIs / Recent Sessions when the API returns no sessions yet. */
const SPECIALIST_DEMO_HOME_SESSIONS: EegSessionRow[] = [
  {
    session_id: 91001,
    patient_national_id: '1616161616',
    specialist_national_id: '3030303030',
    model_id: 1,
    start_time: '2026-05-10T08:15:00',
    end_time: '2026-05-10T08:45:00',
    detected_word: 'عطش',
    confidence_level: 0.88,
    top_predicted_word: 'عطش',
    top_predicted_word_avg_confidence: 0.87,
    device: 'EPOC X',
    channels: 14,
    session_status: 'Ended',
  },
  {
    session_id: 91002,
    patient_national_id: '7070707070',
    specialist_national_id: '3030303030',
    model_id: 1,
    start_time: '2026-05-10T10:20:00',
    end_time: '2026-05-10T10:55:00',
    detected_word: 'جوع',
    confidence_level: 0.84,
    top_predicted_word: 'جوع',
    top_predicted_word_avg_confidence: 0.85,
    device: 'EPOC X',
    channels: 14,
    session_status: 'Ended',
  },
  {
    session_id: 91003,
    patient_national_id: '6060606060',
    specialist_national_id: '3030303030',
    model_id: 1,
    start_time: '2026-05-11T07:05:00',
    end_time: '2026-05-11T07:40:00',
    detected_word: 'حمام',
    confidence_level: 0.82,
    top_predicted_word: 'حمام',
    top_predicted_word_avg_confidence: 0.83,
    device: 'EPOC X',
    channels: 14,
    session_status: 'Ended',
  },
  {
    session_id: 91004,
    patient_national_id: '9292929292',
    specialist_national_id: '3030303030',
    model_id: 1,
    start_time: '2026-05-11T09:30:00',
    end_time: '2026-05-11T10:00:00',
    detected_word: 'دواء',
    confidence_level: 0.86,
    top_predicted_word: 'دواء',
    top_predicted_word_avg_confidence: 0.86,
    device: 'EPOC X',
    channels: 14,
    session_status: 'Ended',
  },
];

/** Only `0`, `0.`, `0.xx` (up to 2 decimals after `.`), or exactly `1`. */
function sanitizeMinConfidenceDraft(raw: string): string {
  let t = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
  const dot = t.indexOf('.');
  if (dot !== -1) {
    t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '');
  }
  if (t.startsWith('.')) {
    t = `0${t}`;
  }
  if (t === '') return '';

  if (t.startsWith('1')) {
    return '1';
  }

  if (!t.startsWith('0')) {
    return '';
  }

  t = t.replace(/^0+(?=\.|$)/, '0');

  if (t === '0') return '0';
  if (t[1] === '.') {
    const frac = t.slice(2).replace(/[^0-9]/g, '').slice(0, 2);
    return `0.${frac}`;
  }
  return '0';
}

function minConfidenceNumberToDraft(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return String(Number(n.toFixed(2)));
}

function coerceMinConfidenceFromApi(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

/** Returns null if empty, incomplete, or outside [0, 1]. */
function parseMinConfidenceForSave(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '.') return null;
  if (t === '1') return 1;
  if (t.startsWith('1')) return null;
  const v = Number(t);
  if (!Number.isFinite(v) || v < 0 || v > 1) return null;
  return v;
}

type EegDecodedWordEvent = { ts: number; word: string };

const EEG_DECODED_WORD_EVENTS_KEY = 'eeg:decoded:word_events';

function computeWeeklyTopWord(events: EegDecodedWordEvent[]): { word: string; count: number } {
  const now = Date.now();
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  const recent = events.filter(
    (e) =>
      e &&
      typeof e.ts === 'number' &&
      e.ts >= cutoff &&
      typeof e.word === 'string' &&
      e.word.trim().length > 0,
  );
  const counts = new Map<string, number>();
  for (const e of recent) {
    const w = e.word.trim();
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  let bestWord = '';
  let bestN = 0;
  for (const [w, n] of counts) {
    if (n > bestN) {
      bestN = n;
      bestWord = w;
    }
  }
  return { word: bestWord, count: bestN };
}

type SettingsParticleSpec = {
  size: number;
  color: string;
  top?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  bottom?: `${number}%`;
};

const SETTINGS_PARTICLE_SPECS: SettingsParticleSpec[] = [
  { top: '4%', left: '3%', size: 88, color: 'rgba(34,197,94,0.2)' },
  { top: '36%', right: '5%', size: 108, color: 'rgba(37,99,235,0.16)' },
  { bottom: '10%', left: '12%', size: 96, color: 'rgba(56,189,248,0.14)' },
  { top: '58%', left: '6%', size: 72, color: 'rgba(16,185,129,0.15)' },
  { top: '18%', right: '26%', size: 54, color: 'rgba(59,130,246,0.12)' },
  { bottom: '20%', right: '10%', size: 78, color: 'rgba(34,197,94,0.1)' },
];

function SettingsAmbientParticle({
  spec,
  progress,
  index,
}: {
  spec: SettingsParticleSpec;
  progress: SharedValue<number>;
  index: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const phase = progress.value * Math.PI * 2 + index * 1.05;
    return {
      opacity: 0.55 + 0.45 * Math.sin(phase),
      transform: [{ scale: 1 + 0.07 * Math.sin(phase * 0.88) }],
    };
  });
  const { size, color, top, left, right, bottom } = spec;
  return (
    <AnimatedRe.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          right,
          bottom,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function SettingsAmbientParticles() {
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 14000, easing: ReEasing.inOut(ReEasing.ease) }),
      -1,
      true,
    );
  }, [progress]);
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {SETTINGS_PARTICLE_SPECS.map((spec, index) => (
        <SettingsAmbientParticle key={index} spec={spec} progress={progress} index={index} />
      ))}
    </View>
  );
}

/** Gloss + soft animated particles behind settings forms (matches global header glass language). */
function SettingsPageGlassCard({ children }: { children: React.ReactNode }) {
  const shimmer = useSharedValue(0);
  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 9000, easing: ReEasing.inOut(ReEasing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.26 + 0.1 * Math.sin(shimmer.value * Math.PI * 2),
  }));
  return (
    <View style={[styles.adminTableCard, styles.adminFullWidthCard, styles.settingsGlassShell]}>
      <View style={styles.settingsParticlesWrap} pointerEvents="none">
        <SettingsAmbientParticles />
      </View>
      <AnimatedRe.View style={[styles.settingsGlassShimmer, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,166,81,0.16)', 'rgba(27,54,93,0.24)', 'rgba(0,166,81,0.14)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </AnimatedRe.View>
      <View style={styles.settingsGlassInner}>{children}</View>
    </View>
  );
}

/** Matches `GET /admin/system-logs` rows; used in __DEV__ when the DB has no logs yet. */
type AdminSystemLogRow = {
  id: string | number;
  userName: string;
  role: string;
  nationalId: string;
  event: string;
  timestamp: string;
};

const MOCK_ADMIN_SYSTEM_LOGS: AdminSystemLogRow[] = [
  {
    id: 'L-1042',
    userName: 'Dr. Nora Al-Faisal',
    role: 'Admin',
    nationalId: '1000123456',
    event: 'Approved specialist access request (user ID 128)',
    timestamp: '2026-05-11 09:14:22',
  },
  {
    id: 'L-1041',
    userName: 'Khalid Al-Mutairi',
    role: 'Specialist',
    nationalId: '2000456789',
    event: 'Opened live EEG session #4821 for patient P-0092',
    timestamp: '2026-05-11 08:52:03',
  },
  {
    id: 'L-1040',
    userName: 'System',
    role: 'Admin',
    nationalId: '—',
    event: 'Production model metadata updated (CNN-BiLSTM v2.3.1)',
    timestamp: '2026-05-11 08:31:17',
  },
  {
    id: 'L-1039',
    userName: 'Layla Al-Harbi',
    role: 'Admin',
    nationalId: '1000789012',
    event: 'Reset MFA for user sara.m@example.com',
    timestamp: '2026-05-10 16:08:44',
  },
  {
    id: 'L-1038',
    userName: 'Omar Al-Qahtani',
    role: 'Specialist',
    nationalId: '2000334455',
    event: 'Exported session report CSV (session #4798)',
    timestamp: '2026-05-10 14:22:51',
  },
  {
    id: 'L-1037',
    userName: 'Dr. Nora Al-Faisal',
    role: 'Admin',
    nationalId: '1000123456',
    event: 'Deactivated account for national ID 3000111222',
    timestamp: '2026-05-10 11:05:09',
  },
  {
    id: 'L-1036',
    userName: 'Fatima Al-Zahrani',
    role: 'Specialist',
    nationalId: '2000567890',
    event: 'Adjusted patient notification thresholds (min confidence 65%)',
    timestamp: '2026-05-09 19:41:33',
  },
  {
    id: 'L-1035',
    userName: 'System',
    role: 'Admin',
    nationalId: '—',
    event: 'Scheduled backup completed successfully',
    timestamp: '2026-05-09 02:00:01',
  },
];

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { user, updateUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNationalId, setNewUserNationalId] = useState('');
  const [newUserGender, setNewUserGender] = useState<'Male' | 'Female'>('Male');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Specialist'>('Specialist');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserMessage, setNewUserMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [modelFormName, setModelFormName] = useState('');
  const [modelFormVersion, setModelFormVersion] = useState('');
  const [modelFormTrainingDate, setModelFormTrainingDate] = useState('');
  const [modelFormAccuracy, setModelFormAccuracy] = useState('');
  const [modelFormLoading, setModelFormLoading] = useState(false);
  const [modelFormSaving, setModelFormSaving] = useState(false);
  const [deletePatientMessage, setDeletePatientMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [modelFormMessage, setModelFormMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [adminModelsList, setAdminModelsList] = useState<AdminModelRow[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettingsState>(INITIAL_ADMIN_SETTINGS);
  const [specialistMedicalSettings, setSpecialistMedicalSettings] =
    useState<SpecialistMedicalSettingsState>(INITIAL_SPECIALIST_MEDICAL_SETTINGS);
  const [specPatients, setSpecPatients] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [newPatientRoom, setNewPatientRoom] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientNationalId, setNewPatientNationalId] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female'>('Female');
  const [newPatientMessage, setNewPatientMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [recSessions, setRecSessions] = useState<any[]>([]);
  const [recReportOpen, setRecReportOpen] = useState(false);
  const [recReportLoading, setRecReportLoading] = useState(false);
  const [recReportError, setRecReportError] = useState<string | null>(null);
  const [recReport, setRecReport] = useState<LiveDemoSessionReport | null>(null);

  // ── EEG model inference (Patient/RegisteredUser dashboard) ──
  const [eegPredictError, setEegPredictError] = useState<string | null>(null);
  const [eegPredictResult, setEegPredictResult] = useState<EegPredictWindowResponse | null>(null);
  /** Tap predicted word to toggle Arabic / English when a gloss exists. */
  const [eegPredictWordShowEn, setEegPredictWordShowEn] = useState(false);
  const [eegLiveRunning, setEegLiveRunning] = useState(false);
  const eegLiveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [eegLiveTimerLabel, setEegLiveTimerLabel] = useState('00:00:00');
  const eegLiveTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eegLiveStartedAtRef = useRef<number | null>(null);
  const [eegLiveSessionDecodedCount, setEegLiveSessionDecodedCount] = useState(0);
  const [eegDecodedWeekCount, setEegDecodedWeekCount] = useState(0);
  const [eegHighConfAlertsTodayCount, setEegHighConfAlertsTodayCount] = useState(0);
  const [eegWeeklyTopWord, setEegWeeklyTopWord] = useState<{ word: string; count: number }>({ word: '—', count: 0 });
  const [eegLiveAvgConfidence, setEegLiveAvgConfidence] = useState(0);
  const eegLiveConfSumRef = useRef(0);
  const eegLiveEventsRef = useRef<Array<{ event_time: string; detected_word: string; confidence: number }>>([]);
  const eegAlertSoundRef = useRef<Audio.Sound | null>(null);
  const EEG_DECODED_TS_KEY = 'eeg:decoded:timestamps';

  // ── Admin model artifact status + test inference ──
  const [modelArtifact, setModelArtifact] = useState<ModelArtifactStatus | null>(null);
  const [modelArtifactLoading, setModelArtifactLoading] = useState(false);
  const [adminModelTestLoading, setAdminModelTestLoading] = useState(false);
  const [adminModelTestError, setAdminModelTestError] = useState<string | null>(null);
  const [adminModelTestResult, setAdminModelTestResult] = useState<EegPredictWindowResponse | null>(null);

  // ── Specialist sessions (real DB rows) ──
  const [specSessions, setSpecSessions] = useState<EegSessionRow[]>([]);
  const [specSessionsLoading, setSpecSessionsLoading] = useState(false);
  const [specSessionsError, setSpecSessionsError] = useState<string | null>(null);
  const [specPatientNotifs, setSpecPatientNotifs] = useState<SpecialistPatientNotificationRow[]>([]);
  const [createSessionLoading, setCreateSessionLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // ── Patient settings (persisted) ──
  const [patientSettings, setPatientSettings] = useState<PatientSettings | null>(null);
  const [patientSettingsLoading, setPatientSettingsLoading] = useState(false);
  const [patientSettingsSaving, setPatientSettingsSaving] = useState(false);
  const [patientSettingsMessage, setPatientSettingsMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [minConfidenceDraft, setMinConfidenceDraft] = useState('');
  const patientSettingsFetchAbortRef = useRef<AbortController | null>(null);
  const patientSettingsRef = useRef<PatientSettings | null>(null);
  const minConfidenceDraftRef = useRef('');
  const patientSettingsAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePatientSettingsAutosaveRef = useRef<() => void>(() => {});
  const prevRecipientSidebarKeyRef = useRef<SidebarItemKey | undefined>(undefined);
  const prevSpecialistSidebarKeyRef = useRef<SidebarItemKey | undefined>(undefined);

  useEffect(() => {
    patientSettingsRef.current = patientSettings;
  }, [patientSettings]);
  useEffect(() => {
    minConfidenceDraftRef.current = minConfidenceDraft;
  }, [minConfidenceDraft]);

  // Change password form (patient)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // ── Edit User (Admin) ──
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserGender, setEditUserGender] = useState('');
  const [editUserMessage, setEditUserMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // ── Edit Patient (Specialist) ──
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editPatientRoom, setEditPatientRoom] = useState('');
  const [editPatientName, setEditPatientName] = useState('');
  const [editPatientDob, setEditPatientDob] = useState('');
  const [editPatientGender, setEditPatientGender] = useState<'Male' | 'Female'>('Female');
  const [editPatientMessage, setEditPatientMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // ── Edit Patient (Registred User) ──
  const [profileName,    setProfileName]    = useState(user?.name  ?? '');
  const [profileEmail,   setProfileEmail]   = useState(user?.email ?? '');
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? (user as any)?.phone_num ?? '');
  const [profileMessage, setProfileMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name ?? '');
    setProfileEmail(user.email ?? '');
    setProfilePhone(user.phone ?? '');
  }, [user?.id, user?.name, user?.email, user?.phone]);

  const initialSidebarItem: SidebarItemKey =
    user?.role === 'admin'
      ? 'admin-dashboard'
      : user?.role === 'specialist'
      ? 'spec-dashboard'
      : 'rec-dashboard';
  const [activeSidebarItem, setActiveSidebarItem] = useState<SidebarItemKey>(initialSidebarItem);

  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
    if ((user?.role ?? 'RegisteredUser') === 'RegisteredUser') {
      readHighConfAlertsTodayCount().then(setEegHighConfAlertsTodayCount).catch(() => undefined);
      getDecodedWeekCount().then(setEegDecodedWeekCount).catch(() => undefined);
      refreshWeeklyWordStats().catch(() => undefined);
    }
  };

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    if (digitsOnly.length > 1 && !digitsOnly.startsWith('05')) return;
    setProfilePhone(digitsOnly);
  };

  const isValidName = (name: string) =>
  /^[A-Za-z\u0600-\u06FF\s.\-]+$/.test(name.trim());

  const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const openAddUserForm = () => {
    setShowAddUserForm(true);
    setNewUserMessage(null);
  };

  const resetAddUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserNationalId('');
    setNewUserGender('Male');
    setNewUserRole('Specialist');
  };

  const handleAddUser = async () => {
    const trimmedName = newUserName.trim();
    const trimmedEmail = newUserEmail.trim();
    const trimmedNationalId = newUserNationalId.trim();
    setNewUserMessage(null);

    // Frontend validation
    if (!trimmedName || !trimmedEmail || !trimmedNationalId) {
      setNewUserMessage({ type: 'error', text: 'Name, email, and national ID are required.' });
      return;
    }
    // ── NEW ──
    if (!/^[A-Za-z\u0600-\u06FF\s.\-]+$/.test(trimmedName)) {
      setNewUserMessage({ type: 'error', text: 'Name must contain only letters and spaces.' });
      return;
    }
    if (!/^\d{10}$/.test(trimmedNationalId)) {
      setNewUserMessage({ type: 'error', text: 'National ID must be exactly 10 digits.' });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setNewUserMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    try {
      const result = await addUser({
        national_id: trimmedNationalId,
        name: trimmedName,
        email: trimmedEmail,
        phone: newUserPhone,
        role: newUserRole,
        gender: newUserGender,
        performed_by_name: user?.name ?? 'Admin',
        performed_by_id: user?.id ?? 'unknown',
      });
      const updated = await getUsers();
      setAdminUsers(updated);
      setNewUserMessage({
        type: 'success',
        text: `User added. Temporary password: ${result.temp_password} — share it securely; ask them to sign in and change it.`,
      });
      resetAddUserForm();
    } catch (err: any) {
      setNewUserMessage({ type: 'error', text: err.message });
    }
  };

  const handleCancelAddUser = () => {
    setShowAddUserForm(false);
    setNewUserMessage(null);
    resetAddUserForm();
  };

  const resetAddPatientForm = () => {
    setNewPatientRoom('');
    setNewPatientName('');
    setNewPatientNationalId('');
    setNewPatientDob('');
    setNewPatientGender('Female');
  };

  const openAddPatientForm = () => {
    setShowAddPatientForm(true);
    setNewPatientMessage(null);
  };

  const handleCancelAddPatient = () => {
    setShowAddPatientForm(false);
    setNewPatientMessage(null);
    resetAddPatientForm();
  };

  const openEditUser = (userRow: any) => {
    setEditingUser(userRow);
    setEditUserName(userRow.name);
    setEditUserEmail(userRow.email);
    setEditUserPhone(userRow.phone ?? '');
    setEditUserGender(userRow.gender ?? 'Male');
    setEditUserMessage(null);
    setShowAddUserForm(false);
  };

  const handleSaveUser = async () => {
    const trimmedName  = editUserName.trim();
    const trimmedEmail = editUserEmail.trim();

    if (!trimmedName || !trimmedEmail || !editUserPhone.trim()) {
      setEditUserMessage({ type: 'error', text: 'Name, email, and phone number are required.' });
      return;
    }
    if (!/^[A-Za-z\u0600-\u06FF\s.\-]+$/.test(trimmedName)) {
      setEditUserMessage({ type: 'error', text: 'Name must contain only letters and spaces.' });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEditUserMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (editUserPhone.trim() && editUserPhone.trim().length !== 10) {
      setEditUserMessage({ type: 'error', text: 'Phone number must be exactly 10 digits.' });
      return;
    }
    try {
      const res = await fetch(`${getApiBase()}/admin/users/${editingUser.nationalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              trimmedName,
          email:             trimmedEmail,
          phone:             editUserPhone.trim(),
          gender:            editUserGender,
          role:              editingUser.role,
          performed_by_name: user?.name ?? 'Admin',   // ← add
          performed_by_id:   user?.id   ?? 'unknown', // ← add
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Update failed');
      setAdminUsers(prev => prev.map(u => u.nationalId === editingUser.nationalId ? { ...u, name: trimmedName, email: trimmedEmail } : u));
      setEditUserMessage({ type: 'success', text: 'User updated successfully.' });
      setTimeout(() => setEditingUser(null), 1000);
    } catch (err: any) {
      setEditUserMessage({ type: 'error', text: err.message });
    }
  };

  const profileAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSaveProfile = useCallback(
    async (silent: boolean): Promise<boolean> => {
      const name = profileName.trim();
      const email = profileEmail.trim();
      const phone = profilePhone.trim();
      if (!silent) setProfileMessage(null);

      if (!name || !email) {
        if (!silent) setProfileMessage({ type: 'error', text: 'Name and email are required.' });
        return false;
      }
      if (!isValidName(name)) {
        if (!silent) setProfileMessage({ type: 'error', text: 'Name must contain only letters and spaces.' });
        return false;
      }
      if (!isValidEmail(email)) {
        if (!silent) setProfileMessage({ type: 'error', text: 'Please enter a valid email address.' });
        return false;
      }
      if (phone && !/^05\d{8}$/.test(phone)) {
        if (!silent) setProfileMessage({ type: 'error', text: 'Phone must be 10 digits and start with 05.' });
        return false;
      }

      try {
        const res = await fetch(`${getApiBase()}/profile/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            national_id: user?.id,
            role: user?.role,
            name,
            email,
            phone: profilePhone.trim(),
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Update failed');
        const u = result.user as
          | { id?: string; name?: string; email?: string; phone?: string; nationalId?: string }
          | undefined;
        if (u && user) {
          const nextName = typeof u.name === 'string' && u.name.trim() ? u.name.trim() : name;
          const nextEmail = typeof u.email === 'string' && u.email.trim() ? u.email.trim() : email;
          const apiPhone = u.phone != null ? String(u.phone).trim() : '';
          const nextPhone = apiPhone || profilePhone.trim();
          updateUser({
            name: nextName,
            email: nextEmail,
            ...(nextPhone ? { phone: nextPhone } : {}),
          });
          setProfileName(nextName);
          setProfileEmail(nextEmail);
          if (nextPhone) setProfilePhone(nextPhone);
        }
        if (!silent) {
          setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
        } else {
          setProfileMessage(null);
        }
        return true;
      } catch (err: any) {
        setProfileMessage({ type: 'error', text: err.message });
        return false;
      }
    },
    [profileName, profileEmail, profilePhone, user, updateUser],
  );

  const flushProfileAutosave = useCallback(async () => {
    if (profileAutosaveTimerRef.current) {
      clearTimeout(profileAutosaveTimerRef.current);
      profileAutosaveTimerRef.current = null;
    }
    if (!user?.id) return;
    const name = profileName.trim();
    const email = profileEmail.trim();
    const phone = profilePhone.trim();
    const dirty =
      name !== (user.name ?? '').trim() ||
      email !== (user.email ?? '').trim() ||
      phone !== (user.phone ?? '').trim();
    if (!dirty) return;
    await performSaveProfile(true);
  }, [performSaveProfile, user?.id, user?.name, user?.email, user?.phone, profileName, profileEmail, profilePhone]);

  useEffect(() => {
    if (!user?.id) return;
    const onProfileSettings =
      activeSidebarItem === 'rec-settings' || activeSidebarItem === 'spec-settings';
    if (!onProfileSettings) return;

    const name = profileName.trim();
    const email = profileEmail.trim();
    const phone = profilePhone.trim();
    const dirty =
      name !== (user.name ?? '').trim() ||
      email !== (user.email ?? '').trim() ||
      phone !== (user.phone ?? '').trim();
    if (!dirty) return;

    if (profileAutosaveTimerRef.current) {
      clearTimeout(profileAutosaveTimerRef.current);
    }
    profileAutosaveTimerRef.current = setTimeout(() => {
      profileAutosaveTimerRef.current = null;
      void performSaveProfile(true);
    }, 900);

    return () => {
      if (profileAutosaveTimerRef.current) {
        clearTimeout(profileAutosaveTimerRef.current);
        profileAutosaveTimerRef.current = null;
      }
    };
  }, [
    user?.id,
    user?.name,
    user?.email,
    user?.phone,
    profileName,
    profileEmail,
    profilePhone,
    activeSidebarItem,
    performSaveProfile,
  ]);

  const handleChangePassword = async () => {
    if (!user?.id) return;
    setPasswordMessage(null);
    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: 'error', text: 'Enter your current password and a new password.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await changePatientPassword({
        national_id: String(user.id),
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage({ type: 'success', text: 'Password updated.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to change password';
      setPasswordMessage({ type: 'error', text: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  const openEditPatient = (patient: any) => {
    setEditingPatient(patient);
    setEditPatientRoom(
      String(patient.roomNumber ?? patient.room_number ?? '').trim(),
    );
    setEditPatientName(patient.name);
    setEditPatientDob(patient.dob);
    setEditPatientGender(patient.gender === 'Male' ? 'Male' : 'Female');
    setEditPatientMessage(null);
    setShowAddPatientForm(false);
  };

  const handleSavePatient = async () => {
    const room = editPatientRoom.trim();
    if (!room || !editPatientName.trim() || !editPatientDob.trim()) {
      setEditPatientMessage({ type: 'error', text: 'Room number, name, and DOB are required.' });
      return;
    }
    if (room.length > 10) {
      setEditPatientMessage({ type: 'error', text: 'Room number must be at most 10 characters.' });
      return;
    }
    if (!/^[A-Za-z\u0600-\u06FF\s.\-]+$/.test(editPatientName.trim())) {
      setEditPatientMessage({ type: 'error', text: 'Name must contain only letters and spaces.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editPatientDob.trim())) {
      setEditPatientMessage({ type: 'error', text: 'Use DOB format YYYY-MM-DD.' });
      return;
    }
    try {
      const res = await fetch(`${getApiBase()}/specialist/patients/${editingPatient.nationalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number:       room,
          name:              editPatientName.trim(),
          dob:               editPatientDob.trim(),
          gender:            editPatientGender,
          performed_by_name: user?.name ?? 'Specialist',
          performed_by_id:   user?.id   ?? 'unknown',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Update failed');
      setSpecPatients(prev =>
        prev.map(p =>
          p.nationalId === editingPatient.nationalId
            ? {
                ...p,
                roomNumber: room,
                name: editPatientName.trim(),
                dob: editPatientDob.trim(),
                gender: editPatientGender,
              }
            : p,
        ),
      );
      setEditPatientMessage({ type: 'success', text: 'Patient updated successfully.' });
      setTimeout(() => setEditingPatient(null), 1000);
    } catch (err: any) {
      setEditPatientMessage({ type: 'error', text: err.message });
    }
  };

const handleAddPatient = async () => {
    const room       = newPatientRoom.trim();
    const name       = newPatientName.trim();
    const nationalId = newPatientNationalId.trim();
    const dob        = newPatientDob.trim();
    setNewPatientMessage(null);

    if (!room || !name || !nationalId || !dob) {
      setNewPatientMessage({
        type: 'error',
        text: 'Room number, name, National ID, and DOB are required.',
      });
      return;
    }
    if (room.length > 10) {
      setNewPatientMessage({
        type: 'error',
        text: 'Room number must be at most 10 characters.',
      });
      return;
    }
    if (!/^\d{10}$/.test(nationalId)) {
      setNewPatientMessage({ type: 'error', text: 'National ID must be exactly 10 digits.' });
      return;
    }
    
    if (!/^[A-Za-z\u0600-\u06FF\s.\-]+$/.test(name)) {
      setNewPatientMessage({ type: 'error', text: 'Name must contain only letters and spaces.' });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setNewPatientMessage({ type: 'error', text: 'Use DOB format YYYY-MM-DD.' });
      return;
    }

    try {
      await addPatient({
        national_id:       nationalId,
        room_number:       room,
        name:              name,
        dob:               dob,
        gender:            newPatientGender,
        specialist_id:     user?.id,
        performed_by_name: user?.name ?? 'Specialist',
        performed_by_id:   user?.id   ?? 'unknown',
      });

      const updated = await getPatients(user?.id);
      setSpecPatients(updated);
      setNewPatientMessage({ type: 'success', text: 'Patient added successfully.' });
      resetAddPatientForm();

    } catch (err: any) {
      setNewPatientMessage({ type: 'error', text: err.message });
    }
  };

  const setBooleanSetting = <K extends keyof AdminSettingsState>(
    key: K,
    value: AdminSettingsState[K]
  ) => {
    setAdminSettings((prev) => ({ ...prev, [key]: value }));
  };

  const setSpecialistMedicalBoolean = <K extends keyof SpecialistMedicalSettingsState>(
    key: K,
    value: SpecialistMedicalSettingsState[K],
  ) => {
    setSpecialistMedicalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumericSettingChange = (
    key: 'sessionTimeoutMinutes' | 'passwordExpiryDays' | 'dataRetentionDays'
  ) => (text: string) => {
    const sanitized = text.replace(/[^\d]/g, '');
    setAdminSettings((prev) => ({ ...prev, [key]: sanitized }));
  };

  const backupFrequencyOptions: AdminSettingsState['backupFrequency'][] = [
    'Hourly',
    'Daily',
    'Weekly',
    'Monthly',
  ];
  const genderOptions: Array<'Male' | 'Female'> = ['Male', 'Female'];
  const roleOptions: Array<'Admin' | 'Specialist'> = ['Admin', 'Specialist'];

  const role: UserRole = user?.role ?? 'RegisteredUser';
  const isAdmin = role === 'admin';
  const isUser = role === 'RegisteredUser' 
  const roleLabel = isUser ? 'Patient' : isAdmin ? 'Admin' : 'Clinician';

  const persistPatientSettingsToApi = useCallback(
    async (opts: { showFeedback?: boolean; showSpinner?: boolean } = {}): Promise<boolean> => {
      const uid = String(user?.id || '').trim();
      const ps = patientSettingsRef.current;
      if (!uid || !ps) return false;
      const parsedMc = parseMinConfidenceForSave(minConfidenceDraftRef.current);
      if (parsedMc === null) {
        if (opts.showFeedback) {
          setPatientSettingsMessage({
            type: 'error',
            text: 'Minimum confidence must be a number between 0 and 1 (decimals allowed).',
          });
        }
        return false;
      }
      if (opts.showSpinner) setPatientSettingsSaving(true);
      try {
        patientSettingsFetchAbortRef.current?.abort();
        const saved = await savePatientSettings({
          national_id: uid,
          notify_hunger: ps.notify_hunger,
          notify_thirst: ps.notify_thirst,
          notify_alarm: ps.notify_alarm,
          notify_bathroom: ps.notify_bathroom,
          notify_medicine: ps.notify_medicine,
          min_confidence: parsedMc,
          text_size: ps.text_size,
          high_contrast: ps.high_contrast,
          data_retention_days: ps.data_retention_days,
          recorded_data_usage_allowed: ps.recorded_data_usage_allowed,
          preferred_device: ps.preferred_device,
        });
        const mc = coerceMinConfidenceFromApi(saved?.min_confidence, parsedMc);
        const merged = {
          ...saved,
          min_confidence: mc,
          recorded_data_usage_allowed: Boolean(saved.recorded_data_usage_allowed),
        };
        patientSettingsRef.current = merged;
        setPatientSettings(merged);
        setMinConfidenceDraft(minConfidenceNumberToDraft(mc));
        if (opts.showFeedback) {
          setPatientSettingsMessage({ type: 'success', text: 'Settings saved.' });
        } else {
          setPatientSettingsMessage(null);
        }
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to save settings';
        setPatientSettingsMessage({ type: 'error', text: msg });
        return false;
      } finally {
        if (opts.showSpinner) setPatientSettingsSaving(false);
      }
    },
    [user?.id],
  );

  const flushPatientSettingsAutosave = useCallback(async () => {
    if (patientSettingsAutosaveTimerRef.current) {
      clearTimeout(patientSettingsAutosaveTimerRef.current);
      patientSettingsAutosaveTimerRef.current = null;
    }
    await persistPatientSettingsToApi({ showFeedback: false, showSpinner: false });
  }, [persistPatientSettingsToApi]);

  useEffect(() => {
    const schedule = () => {
      if (!isUser || !user?.id) return;
      if (patientSettingsAutosaveTimerRef.current) {
        clearTimeout(patientSettingsAutosaveTimerRef.current);
      }
      patientSettingsAutosaveTimerRef.current = setTimeout(() => {
        patientSettingsAutosaveTimerRef.current = null;
        void persistPatientSettingsToApi({ showFeedback: false, showSpinner: false });
      }, 650);
    };
    schedulePatientSettingsAutosaveRef.current = schedule;
    return () => {
      if (patientSettingsAutosaveTimerRef.current) {
        clearTimeout(patientSettingsAutosaveTimerRef.current);
        patientSettingsAutosaveTimerRef.current = null;
      }
    };
  }, [isUser, user?.id, persistPatientSettingsToApi]);

  const patchPatientSettings = <K extends keyof PatientSettings>(key: K, value: PatientSettings[K]) => {
    setPatientSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      patientSettingsRef.current = next;
      return next;
    });
    if (isUser && user?.id) {
      schedulePatientSettingsAutosaveRef.current();
    }
  };

  useEffect(() => {
    if (!isUser) {
      setPatientSettings(null);
      setMinConfidenceDraft('');
      prevRecipientSidebarKeyRef.current = undefined;
    }
  }, [isUser]);

  useEffect(() => {
    if (!isUser || !user?.id) return;
    if (patientSettings?.user_national_id === String(user.id)) return;
    patientSettingsFetchAbortRef.current?.abort();
    const ac = new AbortController();
    patientSettingsFetchAbortRef.current = ac;
    setPatientSettingsLoading(true);
    setPatientSettingsMessage(null);
    fetchPatientSettings(String(user.id), { signal: ac.signal })
      .then((s) => {
        if (ac.signal.aborted) return;
        const mc = coerceMinConfidenceFromApi(s.min_confidence, 0.25);
        const merged = {
          ...s,
          min_confidence: mc,
          recorded_data_usage_allowed: Boolean(s.recorded_data_usage_allowed),
        };
        patientSettingsRef.current = merged;
        setPatientSettings(merged);
        setMinConfidenceDraft(minConfidenceNumberToDraft(mc));
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        const msg = e instanceof Error ? e.message : 'Failed to load settings';
        setPatientSettingsMessage({ type: 'error', text: msg });
      })
      .finally(() => {
        if (!ac.signal.aborted) setPatientSettingsLoading(false);
      });
    return () => {
      ac.abort();
      if (patientSettingsFetchAbortRef.current === ac) {
        patientSettingsFetchAbortRef.current = null;
      }
    };
  }, [isUser, user?.id, patientSettings?.user_national_id]);

  useEffect(() => {
    if (!isUser) return;
    const prev = prevRecipientSidebarKeyRef.current;
    if (prev === 'rec-settings' && activeSidebarItem !== 'rec-settings') {
      void flushPatientSettingsAutosave();
      void flushProfileAutosave();
    }
    prevRecipientSidebarKeyRef.current = activeSidebarItem;
  }, [activeSidebarItem, isUser, flushPatientSettingsAutosave, flushProfileAutosave]);

  useEffect(() => {
    if (role !== 'specialist') {
      prevSpecialistSidebarKeyRef.current = undefined;
      return;
    }
    const prev = prevSpecialistSidebarKeyRef.current;
    if (prev === 'spec-settings' && activeSidebarItem !== 'spec-settings') {
      void flushProfileAutosave();
    }
    prevSpecialistSidebarKeyRef.current = activeSidebarItem;
  }, [activeSidebarItem, role, flushProfileAutosave]);

  /** Typing minimum confidence updates draft only; debounce-save so leaving the field is not required. */
  useEffect(() => {
    if (!isUser || !user?.id || !patientSettings) return;
    if (activeSidebarItem !== 'rec-settings') return;
    const parsed = parseMinConfidenceForSave(minConfidenceDraft);
    if (parsed === null) return;
    if (Math.abs(parsed - patientSettings.min_confidence) < 1e-6) return;
    schedulePatientSettingsAutosaveRef.current();
  }, [minConfidenceDraft, isUser, user?.id, patientSettings, activeSidebarItem]);

  useEffect(() => {
    if (!isUser) return;
    readHighConfAlertsTodayCount().then(setEegHighConfAlertsTodayCount).catch(() => undefined);
    const id = setInterval(() => {
      readHighConfAlertsTodayCount().then(setEegHighConfAlertsTodayCount).catch(() => undefined);
    }, 60_000);
    return () => clearInterval(id);
  }, [isUser]);

  /** Sessions tab: <60s → `45s`; <1h → `1m30s` or `2m`; ≥1h → `2h`, `1h30m`, `1h5s`, `1h2m5s`, etc. */
  const formatSessionTabDuration = (durationSeconds: number): string => {
    const s = Math.max(0, Math.floor(durationSeconds));
    if (s < 60) return `${s}s`;
    if (s < 3600) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      if (sec === 0) return `${m}m`;
      return `${m}m${sec}s`;
    }
    const h = Math.floor(s / 3600);
    const rem = s % 3600;
    const m = Math.floor(rem / 60);
    const sec = rem % 60;
    if (m === 0 && sec === 0) return `${h}h`;
    if (m > 0 && sec === 0) return `${h}h${m}m`;
    if (m > 0 && sec > 0) return `${h}h${m}m${sec}s`;
    return `${h}h${sec}s`;
  };


  // Load real users from Flask when admin opens user management
  useEffect(() => {
    if (isAdmin && activeSidebarItem === 'admin-users') {
      setUsersLoading(true);
      getUsers()
        .then(setAdminUsers)
        .catch(console.error)
        .finally(() => setUsersLoading(false));
    }
  }, [isAdmin, activeSidebarItem]);

  useEffect(() => {
    if (role !== 'specialist') return;
    fetchCurrentModel()
      .then((d) => {
        const pct =
          d.model_accuracy != null && Number.isFinite(Number(d.model_accuracy))
            ? Math.round(Number(d.model_accuracy) * 10000) / 100
            : null;
        setAdminStatsData((prev) => ({
          ...prev,
          modelAccuracyPct: pct,
          modelName: d.model_name || '',
          modelVersion: d.model_version || '',
          modelStatus: d.model_status || '',
        }));
      })
      .catch(() => undefined);
  }, [role]);
  
  useEffect(() => {
    if (!isAdmin || activeSidebarItem !== 'admin-models') return;
    setModelFormLoading(true);
    setModelFormMessage(null);
    Promise.all([fetchCurrentModel(), fetchAdminModels()])
      .then(([d, { models }]) => {
        setModelFormName(d.model_name || '');
        setModelFormVersion(d.model_version || '');
        setModelFormTrainingDate(d.training_date || '');
        setModelFormAccuracy(d.model_accuracy != null ? String(Math.round(Number(d.model_accuracy) * 10000) / 100) : '');
        setAdminModelsList(models);
        const pct =
          d.model_accuracy != null && Number.isFinite(Number(d.model_accuracy))
            ? Math.round(Number(d.model_accuracy) * 10000) / 100
            : null;
        setAdminStatsData((prev) => ({
          ...prev,
          modelAccuracyPct: pct,
          modelStatus: d.model_status || '',
          modelName: d.model_name || '',
          modelVersion: d.model_version || '',
        }));
      })
      .catch((e: Error) =>
        setModelFormMessage({ type: 'error', text: e.message || 'Could not load model info' }),
      )
      .finally(() => setModelFormLoading(false));
  }, [isAdmin, activeSidebarItem]);

  useEffect(() => {
    if (!isUser || !user?.id) return;
    fetchSpecialistSessions({ patient_national_id: user.id, limit: 100 })
      .then((sessions) => {
        setRecSessions(sessions.map(s => ({
          session_id: s.session_id,
          id: `RS-${s.session_id}`,
          date: sessionListSavedDateTime(s),
          word: sessionListTopWord(s, isRTL),
          accuracy: sessionListTopWordAvgAcc(s),
          duration: (s.start_time && s.end_time)
            ? formatSessionTabDuration((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 1000)
            : '—',
        })));
      })
      .catch(console.error);
  }, [isUser, user?.id]);

  const openRecipientReport = async (sessionId: number) => {
    setRecReportOpen(true);
    setRecReportLoading(true);
    setRecReportError(null);
    setRecReport(null);
    try {
      const report = await fetchLiveDemoSessionReport(sessionId);
      setRecReport(report);
    } catch (e: unknown) {
      setRecReportError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setRecReportLoading(false);
    }
  };


  useEffect(() => {
    if (!isAdmin || activeSidebarItem !== 'admin-models') return;
    setModelArtifactLoading(true);
    fetchModelArtifactStatus()
      .then(setModelArtifact)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Failed to load model artifact status';
        setModelArtifact({ pkl_exists: false, pkl_path: '', pkl_size_bytes: 0, pkl_modified_at: '', config: {}, metadata: {}, read_error: msg });
      })
      .finally(() => setModelArtifactLoading(false));
  }, [isAdmin, activeSidebarItem]);

  useEffect(() => {
    if (role !== 'specialist' || !user?.id) return;
    setPatientsLoading(true);
    getPatients(user.id)
      .then(setSpecPatients)
      .catch(console.error)
      .finally(() => setPatientsLoading(false));
  }, [role, user?.id]);

  useEffect(() => {
    if (role !== 'specialist' || !user?.id) return;
    setSpecSessionsLoading(true);
    setSpecSessionsError(null);
    fetchSpecialistSessions({ specialist_id: user.id, limit: 100 })
      .then(setSpecSessions)
      .catch((e: unknown) => setSpecSessionsError(e instanceof Error ? e.message : 'Failed to load sessions'))
      .finally(() => setSpecSessionsLoading(false));
  }, [role, user?.id]);

  useEffect(() => {
    if (role !== 'specialist' || !user?.id) return;
    fetchSpecialistPatientNotifications({ specialist_id: user.id, limit: 20 })
      .then((r) => setSpecPatientNotifs(r.items || []))
      .catch(() => setSpecPatientNotifs([]));
  }, [role, user?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${getApiBase()}/admin/system-logs`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSystemLogs(data as AdminSystemLogRow[]);
      })
      .catch(console.error);
  }, [isAdmin]);

  const handleSaveModelInfo = async () => {
    const name = modelFormName.trim();
    const version = modelFormVersion.trim();
    const td = modelFormTrainingDate.trim();
    setModelFormMessage(null);
    if (!name || !version || !td) {
      setModelFormMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(td) || Number.isNaN(Date.parse(`${td}T12:00:00`))) {
      setModelFormMessage({ type: 'error', text: 'Training date must be YYYY-MM-DD.' });
      return;
    }
    setModelFormSaving(true);
    try {
      const accStr = modelFormAccuracy.trim();
      if (accStr) {
        const accNum = Number(accStr);
        if (Number.isNaN(accNum) || accNum < 0 || accNum > 100) {
          setModelFormMessage({ type: 'error', text: 'Accuracy must be between 0 and 100.' });
          setModelFormSaving(false);
          return;
        }
      }
      await saveCurrentModel({
        model_name: name,
        model_version: version,
        training_date: td,
        model_accuracy: accStr ? String(Number(accStr) / 100) : '',
        performed_by_id: user?.id ?? '',
        performed_by_name: user?.name ?? 'Admin',
      });
      setModelFormMessage({ type: 'success', text: 'Model information saved.' });
      const [d, { models }] = await Promise.all([fetchCurrentModel(), fetchAdminModels()]);
      setModelFormName(d.model_name || '');
      setModelFormVersion(d.model_version || '');
      setModelFormTrainingDate(d.training_date || '');
      setModelFormAccuracy(
        d.model_accuracy != null && Number.isFinite(Number(d.model_accuracy))
          ? String(Math.round(Number(d.model_accuracy) * 10000) / 100)
          : ''
      );
      setAdminModelsList(models);
      const pct =
        d.model_accuracy != null && Number.isFinite(Number(d.model_accuracy))
          ? Math.round(Number(d.model_accuracy) * 10000) / 100
          : null;
      setAdminStatsData((prev) => ({
        ...prev,
        modelAccuracyPct: pct,
        modelStatus: d.model_status || '',
        modelName: d.model_name || '',
        modelVersion: d.model_version || '',
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setModelFormMessage({ type: 'error', text: msg });
    } finally {
      setModelFormSaving(false);
    }
  };

  const [adminStatsData, setAdminStatsData] = useState({
    users: 0,
    sessions: 0,
    modelAccuracyPct: null as number | null,
    modelStatus: '',
    modelName: '',
    modelVersion: '',
  });

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      fetch(`${getApiBase()}/admin/users`).then(r => r.json()),
      fetch(`${getApiBase()}/admin/sessions?limit=500`).then(r => r.json()),
      fetchCurrentModel().catch(() => null),
      fetchAdminModels().catch(() => ({ models: [] as AdminModelRow[] })),
    ]).then(([users, sessions, cur, { models }]) => {
      const pct =
        cur && cur.model_accuracy != null && Number.isFinite(Number(cur.model_accuracy))
          ? Math.round(Number(cur.model_accuracy) * 10000) / 100
          : null;
      setAdminModelsList(Array.isArray(models) ? models : []);
      setAdminStatsData({
        users: Array.isArray(users) ? users.length : 0,
        sessions: Array.isArray(sessions) ? sessions.length : 0,
        modelAccuracyPct: pct,
        modelStatus: (cur && cur.model_status) || '',
        modelName: (cur && cur.model_name) || '',
        modelVersion: (cur && cur.model_version) || '',
      });
    }).catch(console.error);
  }, [isAdmin]);

  const adminStats = [
    {
      key: 'users',
      label: t('admin.stat.totalUsers'),
      value: String(adminStatsData.users),
      icon: 'people-outline',
      tint: colors.logo.paradiso,
      note: t('admin.stat.allRoles'),
    },
    {
      key: 'sessions',
      label: t('admin.stat.totalSessions'),
      value: String(adminStatsData.sessions),
      icon: 'pulse-outline',
      tint: colors.logo.calypso,
      note: t('admin.stat.allTime'),
    },
    {
      key: 'accuracy',
      label: t('admin.stat.modelAccuracy'),
      value: adminStatsData.modelAccuracyPct != null ? `${adminStatsData.modelAccuracyPct}%` : '—',
      icon: 'checkmark-circle-outline',
      tint: colors.logo.oceanGreen,
      note: adminStatsData.modelStatus || 'Production model',
    },
    // {
    //   key: 'alerts',
    //   label: t('admin.stat.systemAlerts'),
    //   value: '—',
    //   icon: 'notifications-outline',
    //   tint: colors.status.warning,
    //   note: t('admin.stat.comingSoon'),
    // },
  ];

  const modelSummary = useMemo(
    () => {
      const pct = adminStatsData.modelAccuracyPct;
      const trainVal = pct != null ? `${pct}%` : '—';
      let sub = 'From active production model (SQLite)';
      if (adminModelsList.length >= 2) {
        const a = adminModelsList[adminModelsList.length - 2].model_accuracy;
        const b = adminModelsList[adminModelsList.length - 1].model_accuracy;
        const aPct = a <= 1 ? a * 100 : a;
        const bPct = b <= 1 ? b * 100 : b;
        const da = bPct - aPct;
        sub = `${da >= 0 ? '+' : ''}${da.toFixed(1)}% vs previous model row`;
      }
      return [
        {
          key: 'train-acc',
          label: 'Training Accuracy',
          value: trainVal,
          sub,
          icon: 'trending-up-outline' as const,
        },
        {
          key: 'val-loss',
          label: 'Validation Loss',
          value: '—',
          sub: 'Not stored in database',
          icon: 'pulse-outline' as const,
        },
        {
          key: 'model-version',
          label: 'Model Version',
          value: modelFormVersion.trim() || '—',
          sub: modelFormName.trim() || 'Not Set',
          icon: 'hardware-chip-outline' as const,
        },
      ];
    },
    [adminStatsData.modelAccuracyPct, adminModelsList, modelFormName, modelFormVersion],
  );

  const specUsingDemoHomeSessions =
    role === 'specialist' &&
    !specSessionsLoading &&
    !specSessionsError &&
    specSessions.length === 0;

  const specialistHomeSessions: EegSessionRow[] = specUsingDemoHomeSessions
    ? SPECIALIST_DEMO_HOME_SESSIONS
    : specSessions;

  const specKpis = [
    {
      key: 'assigned',
      label: t('spec.stat.assignedPatients'),
      value: String(specPatients.length),
      sub: t('spec.stat.fromYourList'),
    },
    {
      key: 'sessions',
      label: t('spec.stat.totalSessions'),
      value: String(specialistHomeSessions.length),
      sub: specUsingDemoHomeSessions ? t('spec.stat.demoPreview') : t('spec.stat.allTime'),
    },
    {
      key: 'accuracy',
      label: t('spec.stat.modelAccuracy'),
      value: adminStatsData.modelAccuracyPct != null
        ? `${adminStatsData.modelAccuracyPct}%`
        : '—',
      sub: adminStatsData.modelName || 'From active model',
    },
  ];

  const specConnection = { label: 'EEG Connection', value: 'Connected', sub: 'EPOC X' };

  const specRecentSessions = specialistHomeSessions.slice(0, 4).map(s => ({
    id: `R-${s.session_id}`,
    patient: s.patient_national_id,
    word: sessionListTopWord(s, isRTL),
    accuracy: sessionListTopWordAvgAcc(s),
    time: s.start_time ? new Date(s.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
  }));

  const specReports = specSessions.map(s => ({
    id: `REP-${s.session_id}`,
    session_id: s.session_id,
    patient: s.patient_national_id,
    date: sessionListSavedDateTime(s),
    word: sessionListTopWord(s, isRTL),
    accuracy: sessionListTopWordAvgAcc(s),
  }));

  // Recipient mock data
  const recDetectedWord = eegPredictResult?.predicted_word_ar || '—';
  const recDashboardState: {
    detectedWord: string;
    detectedWordEn: string;
    confidenceWidth: DimensionValue;
    confidenceLabel: string;
  } = {
    detectedWord: translateWord(recDetectedWord, isRTL),
    detectedWordEn:
      recDetectedWord !== '—' ? eegDemoWordEnglish(recDetectedWord) : '',
    confidenceWidth: `${Math.round((eegPredictResult?.confidence ?? 0) * 100)}%` as DimensionValue,
    confidenceLabel: eegPredictResult
      ? `${Math.round(eegPredictResult.confidence * 100)}%`
      : '—',
  };

  const buildDemoWindow14x128 = (): number[][] => {
    // Demo-only: deterministic pseudo-signal. Replace once device capture exists.
    const out: number[][] = [];
    for (let ch = 0; ch < 14; ch++) {
      const arr: number[] = [];
      for (let i = 0; i < 128; i++) {
        const t = i / 128;
        arr.push(Math.sin(2 * Math.PI * (4 + ch * 0.2) * t) + 0.05 * Math.cos(2 * Math.PI * 20 * t));
      }
      out.push(arr);
    }
    return out;
  };

  // Removed manual "Run inference" button; live Start/Stop drives demo predictions.

  const stopEegLive = () => {
    if (eegLiveIntervalRef.current) {
      clearInterval(eegLiveIntervalRef.current);
      eegLiveIntervalRef.current = null;
    }
    if (eegLiveTimerIntervalRef.current) {
      clearInterval(eegLiveTimerIntervalRef.current);
      eegLiveTimerIntervalRef.current = null;
    }
    eegLiveStartedAtRef.current = null;
    setEegLiveTimerLabel('00:00:00');
    setEegLiveSessionDecodedCount(0);
    setEegLiveAvgConfidence(0);
    eegLiveConfSumRef.current = 0;
    eegLiveEventsRef.current = [];
    void unloadEegAlertSound();
    setEegLiveRunning(false);
  };

  const loadEegAlertSound = React.useCallback(async () => {
    if (eegAlertSoundRef.current) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/alert-beep.wav'),
        { shouldPlay: false, volume: 1, isLooping: true },
      );
      await sound.setVolumeAsync(1);
      eegAlertSoundRef.current = sound;
    } catch {
      // Missing asset / unsupported
    }
  }, []);

  const unloadEegAlertSound = React.useCallback(async () => {
    const s = eegAlertSoundRef.current;
    eegAlertSoundRef.current = null;
    if (s) await s.unloadAsync().catch(() => undefined);
  }, []);

  const playHighConfAlertSound = React.useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false,
        playThroughEarpieceAndroid: false,
      });
      if (!eegAlertSoundRef.current) await loadEegAlertSound();
      const s = eegAlertSoundRef.current;
      if (s) {
        const st = await s.getStatusAsync();
        // Only play if it's not already looping
        if (st.isLoaded && !st.isPlaying) {
          await s.playAsync();
        }
        return;
      }
    } catch {
      // fall through
    }
  }, [loadEegAlertSound]);

  const stopHighConfAlertSound = React.useCallback(async () => {
    try {
      const s = eegAlertSoundRef.current;
      if (s) {
        const st = await s.getStatusAsync();
        if (st.isLoaded && st.isPlaying) {
          await s.stopAsync();
        }
      }
    } catch {
      // ignore errors
    }
  }, []);

  const getDecodedWeekCount = async (): Promise<number> => {
    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    try {
      const raw = await AsyncStorage.getItem(EEG_DECODED_TS_KEY);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      const kept = arr.filter((t) => typeof t === 'number' && t >= cutoff);
      // prune old entries in storage
      if (kept.length !== arr.length) {
        await AsyncStorage.setItem(EEG_DECODED_TS_KEY, JSON.stringify(kept));
      }
      return kept.length;
    } catch {
      return 0;
    }
  };

  const recordDecodedEvent = async () => {
    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    try {
      const raw = await AsyncStorage.getItem(EEG_DECODED_TS_KEY);
      const arr = raw ? (JSON.parse(raw) as number[]) : [];
      const kept = arr.filter((t) => typeof t === 'number' && t >= cutoff);
      kept.push(now);
      await AsyncStorage.setItem(EEG_DECODED_TS_KEY, JSON.stringify(kept));
      setEegDecodedWeekCount(kept.length);
    } catch {
      // no-op
    }
  };

  const refreshWeeklyWordStats = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(EEG_DECODED_WORD_EVENTS_KEY);
      const arr = raw ? (JSON.parse(raw) as EegDecodedWordEvent[]) : [];
      const now = Date.now();
      const cutoff = now - 7 * 24 * 60 * 60 * 1000;
      const kept = arr.filter((e) => e && typeof e.ts === 'number' && e.ts >= cutoff);
      if (kept.length !== arr.length) {
        await AsyncStorage.setItem(EEG_DECODED_WORD_EVENTS_KEY, JSON.stringify(kept));
      }
      const top = computeWeeklyTopWord(kept);
      setEegWeeklyTopWord(top.count === 0 ? { word: '—', count: 0 } : top);
    } catch {
      setEegWeeklyTopWord({ word: '—', count: 0 });
    }
  }, []);

  const recordDecodedWordEvent = async (word: string) => {
    const w = (word || '').trim();
    if (!w) return;
    const now = Date.now();
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    try {
      const raw = await AsyncStorage.getItem(EEG_DECODED_WORD_EVENTS_KEY);
      const arr = raw ? (JSON.parse(raw) as EegDecodedWordEvent[]) : [];
      const kept = arr.filter((e) => e && typeof e.ts === 'number' && e.ts >= cutoff);
      kept.push({ ts: now, word: w });
      const capped = kept.slice(-2000);
      await AsyncStorage.setItem(EEG_DECODED_WORD_EVENTS_KEY, JSON.stringify(capped));
      const top = computeWeeklyTopWord(capped);
      setEegWeeklyTopWord(top.count === 0 ? { word: '—', count: 0 } : top);
    } catch {
      // no-op
    }
  };

  const formatElapsed = (elapsedMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const runOneLiveDemoInference = async () => {
    // Live demo uses LiveDataModels RF 4-word model (subject: aya)
    const res = await predictLiveDemo('aya');
    setEegPredictResult(res);
    const wAlert = String(res?.predicted_word_ar || '').trim();
    const cAlert = Number(res?.confidence ?? 0);
    if (wAlert && wAlert !== '—' && cAlert >= EEG_HIGH_CONF_ALERT_THRESHOLD) {
      void playHighConfAlertSound();
      void appendHighConfAlertEvent(cAlert).then(setEegHighConfAlertsTodayCount).catch(() => undefined);
    } else {
      void stopHighConfAlertSound();
    }
    setEegLiveSessionDecodedCount((c) => c + 1);
    eegLiveConfSumRef.current += (res.confidence ?? 0);
    setEegLiveAvgConfidence((eegLiveConfSumRef.current / Math.max(1, eegLiveSessionDecodedCount + 1)));
    recordDecodedEvent().catch(() => undefined);
    if (res?.predicted_word_ar) {
      const nowIso = new Date().toISOString();
      const detectedWord = String(res.predicted_word_ar);
      const confidence = Number(res.confidence ?? 0);

      eegLiveEventsRef.current.push({
        event_time: nowIso,
        detected_word: detectedWord,
        confidence,
      });
      recordDecodedWordEvent(detectedWord).catch(() => undefined);

      // Real-time notifications: backend enforces toggles + min confidence; skip call when local settings already rule it out.
      // Use patientSettingsRef (not closure state) so changes made during an active live demo apply on the next tick without restart.
      const patientId = String(user?.id || '').trim();
      const isRecipient = (user?.role ?? 'RegisteredUser') === 'RegisteredUser';
      const ps = patientSettingsRef.current;
      if (patientId && isRecipient) {
        if (ps && patientBellEligible(ps, detectedWord, confidence)) {
          createNotificationEvent({
            patient_national_id: patientId,
            detected_word: detectedWord,
            confidence,
            event_time: nowIso,
          }).catch(() => undefined);
        }
      }
      // Avoid unbounded growth during long demos
      if (eegLiveEventsRef.current.length > 500) {
        eegLiveEventsRef.current = eegLiveEventsRef.current.slice(-500);
      }
    }
  };

  const handleStartEegLive = async () => {
    if (eegLiveRunning) return;
    setEegPredictError(null);
    setEegLiveRunning(true);
    try {
      await loadEegAlertSound();
      eegLiveStartedAtRef.current = Date.now();
      setEegLiveTimerLabel('00:00:00');
      eegLiveTimerIntervalRef.current = setInterval(() => {
        const startedAt = eegLiveStartedAtRef.current;
        if (!startedAt) return;
        setEegLiveTimerLabel(formatElapsed(Date.now() - startedAt));
      }, 1000);

      await runOneLiveDemoInference();
      // Refresh every 10s for demo
      eegLiveIntervalRef.current = setInterval(() => {
        runOneLiveDemoInference().catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Inference failed';
          setEegPredictError(msg);
        });
      }, 10_000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Inference failed';
      setEegPredictError(msg);
      stopEegLive();
    }
  };

  const handleStopEegLive = async () => {
    const startedAtMs = eegLiveStartedAtRef.current;
    const endedAtMs = Date.now();
    const patientId = String(user?.id ?? '');
    const word = eegPredictResult?.predicted_word_ar ?? '';
    const conf = eegPredictResult?.confidence ?? null;

    const eventsSnapshot = eegLiveEventsRef.current.slice();
    stopEegLive();

    // Persist a session report for the recipient sessions tab
    if (isUser && patientId && word && conf != null && startedAtMs) {
      try {
        await createLiveDemoSession({
          patient_national_id: patientId,
          detected_word: word,
          confidence: conf,
          start_time: new Date(startedAtMs).toISOString(),
          end_time: new Date(endedAtMs).toISOString(),
          device: 'EPOC X',
          events: eventsSnapshot,
        } as any);

        const sessions = await fetchSpecialistSessions({ patient_national_id: patientId, limit: 100 });
        setRecSessions(sessions.map(s => ({
          id: `RS-${s.session_id}`,
          session_id: s.session_id,
          date: sessionListSavedDateTime(s),
          word: sessionListTopWord(s, isRTL),
          accuracy: sessionListTopWordAvgAcc(s),
          duration: (s.start_time && s.end_time)
            ? formatSessionTabDuration((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 1000)
            : '—',
        })));
      } catch (e: unknown) {
        // Don't block UI stop; just show error under chart
        const msg = e instanceof Error ? e.message : 'Failed to save session';
        setEegPredictError(msg);
      }
    }
  };

  useEffect(() => {
    getDecodedWeekCount().then(setEegDecodedWeekCount).catch(() => undefined);
    refreshWeeklyWordStats().catch(() => undefined);
    return () => stopEegLive();
  }, [refreshWeeklyWordStats]);

  useEffect(() => {
    setEegPredictWordShowEn(false);
  }, [eegPredictResult?.predicted_word_ar]);

  const handleAdminRunModelTest = async () => {
    setAdminModelTestError(null);
    setAdminModelTestLoading(true);
    try {
      const win = buildDemoWindow14x128();
      const res = await predictEegWindow(win);
      setAdminModelTestResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Inference failed';
      setAdminModelTestError(msg);
    } finally {
      setAdminModelTestLoading(false);
    }
  };

  const handleSpecCreateSessionFromInference = async () => {
  if (!user?.id) return;
  if (!selectedPatientId) {
    setSpecSessionsError('Please select a patient before creating a session.');
    return;
  }
  const firstPatient = selectedPatientId;
  setCreateSessionLoading(true);
  setSpecSessionsError(null);
  try {
    const startedAtMs = Date.now();
    const res = await predictLiveDemo('aya');
    const endedAtMs = Date.now();

    const detectedWord = String(res?.predicted_word_ar ?? '').trim();
    const confidence = Number(res?.confidence ?? 0);
    const nowIso = new Date(endedAtMs).toISOString();

    const events = detectedWord
      ? [{ event_time: nowIso, detected_word: detectedWord, confidence }]
      : [];

    await createLiveDemoSession({
      patient_national_id: String(firstPatient),
      specialist_national_id: String(user.id),   // ← ADD THIS LINE
      detected_word: detectedWord || '—',
      confidence,
      start_time: new Date(startedAtMs).toISOString(),
      end_time: nowIso,
      device: 'EPOC X',
      events,
    } as any);

    const refreshed = await fetchSpecialistSessions({ specialist_id: user?.id ?? '', limit: 100 });
    setSpecSessions(refreshed);
  } catch (e: unknown) {
    setSpecSessionsError(e instanceof Error ? e.message : 'Failed to create session');
  } finally {
    setCreateSessionLoading(false);
  }
};

  const recTopStats = [
    {
      key: 'topword',
      label: t('patient.stat.mostFrequentWord'),
      value: eegWeeklyTopWord.count === 0 ? '—' : eegWeeklyTopWord.word,
      valueEnd:
        eegWeeklyTopWord.count === 0
          ? undefined
          : eegDemoWordEnglish(eegWeeklyTopWord.word) || undefined,
      note:eegWeeklyTopWord.count === 0 ? t('patient.stat.last7daysDemo') : `${eegWeeklyTopWord.count}× this week`,
      icon: 'trophy-outline' as const,
      tint: colors.logo.paradiso,
    },
    {
      key: 'decoded',
      label: t('patient.stat.signalsDecoded'),
      value: String(eegDecodedWeekCount),
      note: t('patient.stat.last7days'),
      icon: 'analytics-outline' as const,
      tint: colors.logo.calypso,
    },
    {
      key: 'alerts',
      label: t('patient.stat.alertsToday'),
      value: String(eegHighConfAlertsTodayCount),
      note: t('patient.stat.confidence70'),
      icon: 'notifications-outline' as const,
      tint: colors.status.warning,
    },
  ];


  const [systemLogs, setSystemLogs] = useState<AdminSystemLogRow[]>([]);
  const [logRoleFilter, setLogRoleFilter] = useState<string>('All');
  const [logVisibleCount, setLogVisibleCount] = useState(15);
  const LOG_PAGE_SIZE = 15;

  const adminSystemLogsDisplay = useMemo(() => {
    if (systemLogs.length > 0) return systemLogs;
    if (__DEV__) return MOCK_ADMIN_SYSTEM_LOGS;
    return [];
  }, [systemLogs]);

  const filteredLogs = useMemo(() => {
    if (logRoleFilter === 'All') return adminSystemLogsDisplay;
    return adminSystemLogsDisplay.filter(
      (l) => (l.role ?? '').toLowerCase() === logRoleFilter.toLowerCase()
    );
  }, [adminSystemLogsDisplay, logRoleFilter]);

  const logVisibleRows = filteredLogs.slice(0, logVisibleCount);
  const logHasMore = logVisibleCount < filteredLogs.length;

  const filteredAdminUsers = adminUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.id.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.nationalId ?? '').toLowerCase().includes(q) ||
      (u.gender ?? '').toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q)
    );
  });

  

  const systemHealth = [
    { label: 'API Latency', value: '121 ms', status: 'good' as const },
    { label: 'Queue Depth', value: '37 msgs', status: 'info' as const },
    { label: 'Uptime', value: '99.96%', status: 'good' as const },
    { label: 'Last Alert', value: 'EEG drop (5m ago)', status: 'warning' as const },
  ];

  const renderAdminContent = () => {

    if (activeSidebarItem === 'admin-users') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard, styles.recGlassCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('admin.userManagement')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {t('admin.userManagement.subtitle')}
                </AppText>
              </View>
              <TouchableOpacity style={styles.adminPrimaryButton} onPress={openAddUserForm}>
                <Ionicons name="add" size={18} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>Add User</AppText>
              </TouchableOpacity>
            </View>

            {showAddUserForm && (
              <View style={[styles.adminTableCard, styles.recGlassCard, styles.adminFormCard]}>
                <View style={styles.adminFormHeader}>
                  <View>
                    <AppText style={styles.adminTableTitle}>{t('admin.addNewUser')}</AppText>
                    <AppText style={styles.adminTableSubtitle}>
                      {t('admin.addNewUser.hint')}
                    </AppText>
                  </View>
                  <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddUser}>
                    <Ionicons name="close" size={18} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.name')}</AppText>
                    <TextInput
                      value={newUserName}
                      onChangeText={setNewUserName}
                      placeholder="User's full name"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.required')}</AppText>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.email')}</AppText>
                    <TextInput
                      value={newUserEmail}
                      onChangeText={setNewUserEmail}
                      placeholder="name@email.com"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.emailHint')}</AppText>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.phone')}</AppText>
                    <TextInput
                      value={newUserPhone}
                      onChangeText={(text) => {
                        const digits = text.replace(/\D/g, '').slice(0, 10);
                        if (digits.length > 1 && !digits.startsWith('05')) return;
                        setNewUserPhone(digits);
                      }}
                      placeholder="05XXXXXXXX"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.phoneHint')}</AppText>
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.nationalId')}</AppText>
                    <TextInput
                      value={newUserNationalId}
                      onChangeText={setNewUserNationalId}
                      placeholder="10-digit identifier"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.nationalIdHint')}</AppText>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.gender')}</AppText>
                    <View style={styles.adminSelectRow}>
                      {genderOptions.map((option) => {
                        const isActive = newUserGender === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.adminSelectOption,
                              isActive && styles.adminSelectOptionActive,
                            ]}
                            onPress={() => setNewUserGender(option)}
                          >
                            <AppText
                              style={[
                                styles.adminSelectOptionText,
                                isActive && styles.adminSelectOptionTextActive,
                              ]}
                            >
                              {option}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <AppText style={styles.recFormHelper}>{t('admin.form.genderHint')}</AppText>
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.role')}</AppText>
                    <View style={styles.adminSelectRow}>
                      {roleOptions.map((option) => {
                        const isActive = newUserRole === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.adminSelectOption,
                              isActive && styles.adminSelectOptionActive,
                            ]}
                            onPress={() => setNewUserRole(option)}
                          >
                            <AppText
                              style={[
                                styles.adminSelectOptionText,
                                isActive && styles.adminSelectOptionTextActive,
                              ]}
                            >
                              {option}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.status')}</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                      <AppText style={styles.adminStatusText}>{t('admin.form.statusDefault')}</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>{t('admin.form.statusHint')}</AppText>
                  </View>
                </View>

                {newUserMessage && (
                  <View
                    style={[
                      styles.adminFormMessage,
                      newUserMessage.type === 'error'
                        ? styles.adminFormMessageError
                        : styles.adminFormMessageSuccess,
                    ]}
                  >
                    <AppText style={styles.adminFormMessageText}>{newUserMessage.text}</AppText>
                  </View>
                )}

                <View style={styles.adminFormActions}>
                  <AppText style={styles.recFormHelper}>
                    {t('admin.form.requiredFields')}
                  </AppText>
                  <View style={styles.adminFormActionsRow}>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddUser}>
                      <Ionicons name="close" size={16} color={colors.text.primary} />
                      <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminPrimaryButton} onPress={handleAddUser}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>{t('admin.createUser')}</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            {editingUser && (
              <View style={[styles.adminTableCard, styles.recGlassCard, styles.adminFormCard]}>
                <View style={styles.adminFormHeader}>
                  <View>
                    <AppText style={styles.adminTableTitle}>{t('admin.editUser')}</AppText>
                    <AppText style={styles.adminTableSubtitle}>{t('admin.editUser.subtitle')}{editingUser.name} ({editingUser.role})</AppText>
                  </View>
                  <TouchableOpacity style={styles.adminGhostButton} onPress={() => setEditingUser(null)}>
                    <Ionicons name="close" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.fullName')}</AppText>
                    <TextInput value={editUserName} onChangeText={setEditUserName} placeholder="Full name" placeholderTextColor={colors.text.secondary} style={styles.recFormInput} />
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.email')}</AppText>
                    <TextInput value={editUserEmail} onChangeText={setEditUserEmail} placeholder="name@email.com" placeholderTextColor={colors.text.secondary} keyboardType="email-address" autoCapitalize="none" style={styles.recFormInput} />
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.phoneNumber')}</AppText>
                    <TextInput
                      value={editUserPhone}
                      onChangeText={(text) => {
                        const digits = text.replace(/\D/g, '').slice(0, 10);
                        if (digits.length > 1 && !digits.startsWith('05')) return;
                        setEditUserPhone(digits);
                      }}
                      placeholder="05XXXXXXXX"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      style={styles.recFormInput}
                    />
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.gender')}</AppText>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      {(['Male', 'Female'] as const).map(g => (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setEditUserGender(g)}
                          style={[
                            styles.adminSelectOption, 
                            editUserGender === g && styles.adminSelectOptionActive
                          ]}
                        >
                          <AppText style={editUserGender === g ? styles.adminSelectOptionTextActive : styles.adminSelectOptionText}>
                            {g}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                {editUserMessage && (
                  <View style={[styles.adminFormMessage, editUserMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess]}>
                    <AppText style={styles.adminFormMessageText}>{editUserMessage.text}</AppText>
                  </View>
                )}
                <View style={styles.adminFormActions}>
                  <AppText style={styles.recFormHelper}>{t('admin.form.nationalIdReadonly')}</AppText>
                  <View style={styles.adminFormActionsRow}>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={() => setEditingUser(null)}>
                      <Ionicons name="close" size={16} color={colors.text.primary} />
                      <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminPrimaryButton} onPress={handleSaveUser}>
                      <Ionicons name="save-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>{t('admin.saveChanges')}</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            <View style={styles.adminSearchBar}>
              <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
              <TextInput
                placeholder="Search by name, email, national ID, role, or status..."
                placeholderTextColor={colors.text.secondary}
                value={userSearch}
                onChangeText={setUserSearch}
                style={styles.adminSearchInput}
              />
            </View>
            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>{t('admin.table.id')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.name')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.email')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.table.role')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColGender]}>{t('admin.table.gender')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>{t('admin.table.status')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>{t('admin.table.actions')}</AppText>
            </View>

            {filteredAdminUsers.map((userRow) => (
              <React.Fragment key={userRow.id}>
                <View style={styles.adminTableRow}>
                  <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{userRow.id}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColWide]}>{userRow.name}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColWide]}>{userRow.email}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{userRow.role}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColGender]}>{userRow.gender || '—'}</AppText>
                  <View style={styles.adminColSmall}>
                    <View style={[styles.adminStatusPill, userRow.status === 'active' ? styles.adminPillSuccess : styles.adminPillMuted]}>
                      <AppText style={styles.adminStatusText}>
                        {userRow.status === 'active' ? 'Active' : 'Inactive'}
                      </AppText>
                    </View>
                  </View>
                  <View style={[styles.adminTableCellActions, styles.adminColSmall]}>
                    <TouchableOpacity style={styles.adminIconButton} onPress={() => openEditUser(userRow)}>
                      <Ionicons name="create-outline" size={18} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminIconButton}
                      onPress={() => setDeleteUserError(deleteUserError === `delete:${userRow.nationalId}` ? null : `delete:${userRow.nationalId}`)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {deleteUserError === `delete:${userRow.nationalId}` && (
                  <View style={[styles.adminTableRow, { backgroundColor: 'rgba(220,53,69,0.08)', justifyContent: 'flex-end', gap: spacing.sm }]}>
                    <AppText style={[styles.adminTableCell, { color: colors.status.error, flex: 1 }]}>
                      {t('admin.delete')} {userRow.name}? {t('admin.deleteConfirm')}
                    </AppText>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={() => setDeleteUserError(null)}>
                      <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminPrimaryButton}
                      onPress={async () => {
                        try {
                          await deleteUser(userRow.nationalId, userRow.role, user?.name ?? 'Admin', user?.id ?? 'unknown');
                          setAdminUsers(prev => prev.filter(u => u.nationalId !== userRow.nationalId));
                          setDeleteUserError(null);
                        } catch (err: any) {
                          setDeleteUserError(err.message);
                        }
                      }}
                    >
                      <AppText style={styles.adminPrimaryButtonText}>{t('admin.delete')}</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'admin-models') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={styles.modelTopRow}>
            {modelSummary.map((item) => (
              <View key={item.key} style={styles.modelStatCard}>
                <View style={styles.modelStatHeader}>
                  <Ionicons name={item.icon} size={22} color={colors.logo.paradiso} />
                  <AppText style={styles.modelStatLabel}>{item.label}</AppText>
                </View>
                <AppText style={styles.modelStatValue}>{item.value}</AppText>
                <AppText style={styles.modelStatSub}>{item.sub}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.modelRow}>
            <View style={styles.modelHalfCard}>
              <View style={styles.adminTableHeader}>
                <View>
                  <AppText style={styles.adminTableTitle}>{t('admin.deployedModel')}</AppText>
                  <AppText style={styles.adminTableSubtitle}>
                    {t('admin.deployedModel.hint')}
                  </AppText>
                </View>
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <AppText style={styles.recPanelTitle}>{t('admin.modelArtifact')}</AppText>
                {modelArtifactLoading ? (
                  <AppText style={styles.modelFieldHint}>{t('admin.modelArtifact.checking')}</AppText>
                ) : modelArtifact ? (
                  <>
                    <AppText style={styles.recFormHelper}>
                      File: {modelArtifact.pkl_exists ? t('admin.modelArtifact.found') : t('admin.modelArtifact.missing')}
                    </AppText>
                    {modelArtifact.pkl_exists ? (
                      <>
                        <AppText style={styles.recFormHelper}>Path: {modelArtifact.pkl_path}</AppText>
                        <AppText style={styles.recFormHelper}>
                          Size: {Math.round(modelArtifact.pkl_size_bytes / 1024)} KB • Updated: {modelArtifact.pkl_modified_at || '—'}
                        </AppText>
                      </>
                    ) : null}
                    {modelArtifact.read_error ? (
                      <AppText style={[styles.recFormHelper, { color: colors.status.error }]}>
                        {modelArtifact.read_error}
                      </AppText>
                    ) : null}
                    {modelArtifact?.config?.class_names ? (
                      <AppText style={styles.recFormHelper}>
                        Classes: {(modelArtifact.config.class_names as string[]).join(' • ')}
                      </AppText>
                    ) : null}
                  </>
                ) : null}
              </View>

              {modelFormLoading ? (
                <AppText style={styles.modelFieldHint}>{t('admin.model.loading')}</AppText>
              ) : (
                <>
                  <View style={styles.modelInfoField}>
                    <AppText style={styles.recFormLabel}>{t('admin.model.currentName')}</AppText>
                    <TextInput
                      value={modelFormName}
                      onChangeText={setModelFormName}
                      placeholder="e.g. Hybrid CNN-BiLSTM"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                      editable={!modelFormSaving}
                    />
                  </View>
                  <View style={styles.modelInfoField}>
                    <AppText style={styles.recFormLabel}>{t('admin.model.version')}</AppText>
                    <TextInput
                      value={modelFormVersion}
                      onChangeText={setModelFormVersion}
                      placeholder="e.g. v2.3.1"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                      editable={!modelFormSaving}
                    />
                  </View>
                  <CalendarDateField
                    label="Training Date"
                    value={modelFormTrainingDate}
                    onChange={setModelFormTrainingDate}
                    disabled={modelFormSaving}
                    hint={
                      Platform.OS === 'web'
                        ? 'Use the calendar control to pick a date.'
                        : 'Tap the row to open the calendar.'
                    }
                  />
                  <View style={styles.modelInfoField}>
                    <AppText style={styles.recFormLabel}>{t('admin.model.trainingAccuracy')}</AppText>
                    <TextInput
                      value={modelFormAccuracy}
                      onChangeText={(t) => {
                        const n = t.replace(/[^0-9.]/g, '');
                        if (Number(n) > 100) return;
                        setModelFormAccuracy(n);
                      }}
                      placeholder="e.g. 87.5"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="decimal-pad"
                      style={styles.recFormInput}
                      editable={!modelFormSaving}
                    />
                  </View>
                  {modelFormMessage ? (
                    <View
                      style={[
                        styles.adminFormMessage,
                        modelFormMessage.type === 'error'
                          ? styles.adminFormMessageError
                          : styles.adminFormMessageSuccess,
                      ]}
                    >
                      <AppText style={styles.adminFormMessageText}>{modelFormMessage.text}</AppText>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.adminPrimaryButton,
                      { marginTop: spacing.md },
                      modelFormSaving && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveModelInfo}
                    disabled={modelFormSaving}
                  >
                    <Ionicons name="save-outline" size={18} color={colors.text.white} />
                    <AppText style={styles.adminPrimaryButtonText}>
                      {modelFormSaving ? t('admin.model.saving') : t('admin.model.saveInfo')}
                    </AppText>
                  </TouchableOpacity>

                  <View style={{ marginTop: spacing.lg }}>
                    <AppText style={styles.recPanelTitle}>{t('admin.model.quickTest')}</AppText>
                    <AppText style={styles.recFormHelper}>
                      {t('admin.model.quickTest.hint')}
                    </AppText>
                    {adminModelTestError ? (
                      <AppText style={[styles.recFormHelper, { color: colors.status.error }]}>
                        {adminModelTestError}
                      </AppText>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.adminPrimaryButton,
                        { marginTop: spacing.md },
                        adminModelTestLoading && { opacity: 0.7 },
                      ]}
                      onPress={handleAdminRunModelTest}
                      disabled={adminModelTestLoading}
                    >
                      <Ionicons name="hardware-chip-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>
                        {adminModelTestLoading ? t('admin.model.running') : t('admin.model.runTest')}
                      </AppText>
                    </TouchableOpacity>
                    {adminModelTestResult ? (
                      <View style={{ marginTop: spacing.md }}>
                        <AppText style={styles.recFormHelper}>
                          Predicted: {adminModelTestResult.predicted_word_ar} • {Math.round(adminModelTestResult.confidence * 100)}%
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'admin-logs') {
      const LOG_ROLES = ['All', 'Admin', 'Specialist', 'RegisteredUser'];
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('admin.systemLogs')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {filteredLogs.length} {logRoleFilter === 'All' ? 'total' : logRoleFilter} actions
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {LOG_ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setLogRoleFilter(r); setLogVisibleCount(15); }}
                    style={[styles.adminSelectOption, logRoleFilter === r && styles.adminSelectOptionActive]}
                  >
                    <AppText style={logRoleFilter === r ? styles.adminSelectOptionTextActive : styles.adminSelectOptionText}>
                      {r}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.logId')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.user')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>{t('admin.table.role')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.form.nationalId')}</AppText>
              <AppText style={[styles.adminTableHeadText, { flex: 3 }]}>{t('admin.table.event')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.table.timestamp')}</AppText>
            </View>

            {logVisibleRows.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="document-outline" size={32} color={colors.text.secondary} />
                <AppText style={[styles.adminTableSubtitle, { marginTop: 8 }]}>
                  {t('admin.systemLogs.empty')}
                </AppText>
              </View>
            ) : (
              logVisibleRows.map((log) => (
                <View key={log.id} style={styles.adminTableRow}>
                  <AppText style={[styles.adminTableCell, styles.adminColWide]}>{log.id}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColWide]}>{log.userName}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColSmall]}>{log.role ?? '—'}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{log.nationalId}</AppText>
                  <AppText style={[styles.adminTableCell, { flex: 3 }]}>{log.event}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{log.timestamp}</AppText>
                </View>
              ))
            )}

            {logHasMore && (
              <TouchableOpacity
                onPress={() => setLogVisibleCount((c) => c + LOG_PAGE_SIZE)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(55,93,152,0.1)' }}
              >
                <AppText style={[styles.adminTableSubtitle, { color: colors.primary[500] }]}>
                  {t('admin.systemLogs.showMore')} ({filteredLogs.length - logVisibleCount} {t('admin.systemLogs.remaining')})
                </AppText>
                <Ionicons name="chevron-down-outline" size={16} color={colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    
    if (activeSidebarItem === 'admin-settings') {
      return (
        <View style={styles.adminFullWidthSection}>
          <SettingsPageGlassCard>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('admin.settings')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {t('admin.settings.subtitle')}
                </AppText>
              </View>
              <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                <AppText style={styles.adminStatusText}>{t('admin.settings.appliesGlobally')}</AppText>
              </View>
            </View>

            {profileMessage ? (
              <View style={[styles.adminFormMessage, profileMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess, { marginBottom: spacing.md }]}>
                <AppText style={styles.adminFormMessageText}>{profileMessage.text}</AppText>
              </View>
            ) : null}

            <View style={styles.recSettingsForm}>
              <View style={styles.recSettingsRow}>

                <View style={styles.recFormPanel}>
                  <AppText style={styles.recPanelTitle}>{t('admin.profile')}</AppText>

                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.nationalId')}</AppText>
                    <View style={[styles.recFormInput, { justifyContent: 'center', backgroundColor: colors.background.light }]}>
                      <AppText style={{ color: colors.text.secondary }}>{user?.id ?? '—'}</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>{t('admin.form.cannotChange')}</AppText>
                  </View>

                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.fullName')}</AppText>
                    <TextInput value={profileName} onChangeText={setProfileName} style={styles.recFormInput} />
                  </View>

                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.email')}</AppText>
                    <TextInput value={profileEmail} onChangeText={setProfileEmail} keyboardType="email-address" autoCapitalize="none" style={styles.recFormInput} />
                  </View>

                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.phone')}</AppText>
                    <TextInput value={profilePhone} onChangeText={handlePhoneChange} keyboardType="number-pad" maxLength={10} placeholder="05XXXXXXXX" style={styles.recFormInput} />
                  </View>

                  <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }]} onPress={() => performSaveProfile(false)}>
                    <Ionicons name="save-outline" size={16} color={colors.text.white} />
                    <AppText style={styles.adminPrimaryButtonText}>{t('admin.saveChanges')}</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.recFormPanel}>
                  <AppText style={styles.recPanelTitle}>{t('admin.profile.changePassword')}</AppText>

                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.profile.currentPassword')}</AppText>
                    <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={styles.recFormInput} editable={!passwordSaving} />
                  </View>

                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.profile.newPassword')}</AppText>
                    <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.recFormInput} editable={!passwordSaving} />
                    <AppText style={styles.recFormHelper}>{t('admin.profile.passwordHint')}</AppText>
                  </View>

                  {passwordMessage ? (
                    <View style={[styles.adminFormMessage, passwordMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess]}>
                      <AppText style={styles.adminFormMessageText}>{passwordMessage.text}</AppText>
                    </View>
                  ) : null}

                  <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }, passwordSaving && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={passwordSaving}>
                    <Ionicons name="key-outline" size={16} color={colors.text.white} />
                    <AppText style={styles.adminPrimaryButtonText}>{passwordSaving ? t('admin.profile.updating') : t('admin.profile.changePassword')}</AppText>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </SettingsPageGlassCard>
        </View>
      );
    }

    return (
      <>
        <View style={styles.adminStatsGrid}>
          {adminStats.map((stat) => (
            <View key={stat.key} style={styles.adminStatCard}>
              <View style={styles.adminStatContent}>
                <View style={[styles.adminStatIcon, { backgroundColor: stat.tint }]}>
                  <Ionicons name={stat.icon as any} size={26} color={colors.text.white} />
                </View>
                <View style={styles.adminStatTextCol}>
                  <AppText style={styles.adminStatLabel}>{stat.label}</AppText>
                  <AppText style={styles.adminStatValue}>{stat.value}</AppText>
                  <AppText style={styles.adminStatNote}>{stat.note}</AppText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.adminChartRow}>
          <View style={styles.adminChartSide}>
            <View style={styles.adminSideBySideCol}>
              <View style={[styles.adminCard, styles.adminCardFillHeight]}>
                <View style={styles.adminCardHeader}>
                  <AppText style={styles.adminCardTitle}>{t('admin.systemHealth')}</AppText>
                  <AppText style={styles.adminCardSubtitle}>{t('admin.systemHealth.subtitle')}</AppText>
                </View>
                {systemHealth.map((item) => (
                  <View key={item.label} style={styles.adminHealthRow}>
                    <View
                      style={[
                        styles.adminStatusDot,
                        item.status === 'good' && styles.adminDotSuccess,
                        item.status === 'warning' && styles.adminDotWarning,
                        item.status === 'info' && styles.adminDotInfo,
                      ]}
                    />
                    <View style={styles.adminHealthTextCol}>
                      <AppText style={styles.adminHealthLabel}>{item.label}</AppText>
                      <AppText style={styles.adminHealthValue}>{item.value}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.adminSideBySideCol}>
              <View style={[styles.adminCard, styles.adminCardFillHeight]}>
                <View style={styles.adminCardHeader}>
                  <AppText style={styles.adminCardTitle}>{t('admin.activeModel')}</AppText>
                  <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                    <AppText style={styles.adminStatusText} numberOfLines={1}>
                      {[adminStatsData.modelName, adminStatsData.modelVersion].filter(Boolean).join(' ') || '—'}
                    </AppText>
                  </View>
                </View>
                <View style={styles.adminModelRow}>
                  <AppText style={styles.adminModelLabel}>{t('admin.activeModel.accuracy')}</AppText>
                  <AppText style={styles.adminModelValue}>
                    {adminStatsData.modelAccuracyPct != null ? `${adminStatsData.modelAccuracyPct}%` : '—'}
                  </AppText>
                </View>
                <View style={styles.adminModelRow}>
                  <AppText style={styles.adminModelLabel}>{t('admin.activeModel.status')}</AppText>
                  <AppText style={styles.adminModelValue}>
                    {adminStatsData.modelStatus || '—'}
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.adminTableCard}>
          <View style={styles.adminTableHeader}>
            <View>
              <AppText style={styles.adminTableTitle}>{t('admin.systemLogs')}</AppText>
              <AppText style={styles.adminTableSubtitle}>
                {t('admin.systemLogs.subtitle')}
              </AppText>
            </View>
          </View>

          <View style={styles.adminTableHeadRow}>
            <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.logId')}</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.user')}</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>{t('admin.table.role')}</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.form.nationalId')}</AppText>
            <AppText style={[styles.adminTableHeadText, { flex: 3 }]}>{t('admin.table.event')}</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.table.timestamp')}</AppText>
          </View>

          {adminSystemLogsDisplay.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Ionicons name="document-outline" size={32} color={colors.text.secondary} />
              <AppText style={[styles.adminTableSubtitle, { marginTop: 8 }]}>
                {t('admin.systemLogs.empty')}
              </AppText>
            </View>
          ) : (
            adminSystemLogsDisplay.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{log.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{log.userName}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColSmall]}>{log.role ?? '—'}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{log.nationalId}</AppText>
                <AppText style={[styles.adminTableCell, { flex: 3 }]}>{log.event}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{log.timestamp}</AppText>
              </View>
            ))
          )}
        </View>
      </>
    );
  };

  const renderSpecialistContent = () => {
    // Switch by specialist sidebar tab
    if (activeSidebarItem === 'spec-patients') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={styles.adminTableCard}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('admin.patientManagement')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {t('admin.patientManagement.subtitle')}
                </AppText>
              </View>
              <TouchableOpacity style={styles.adminPrimaryButton} onPress={openAddPatientForm}>
                <Ionicons name="add" size={18} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>{t('admin.addPatient')}</AppText>
              </TouchableOpacity>
            </View>

            {showAddPatientForm && (
              <View style={[styles.adminTableCard, styles.recGlassCard, styles.adminFormCard]}>
                <View style={styles.adminFormHeader}>
                  <View>
                    <AppText style={styles.adminTableTitle}>{t('admin.addNewPatient')}</AppText>
                    <AppText style={styles.adminTableSubtitle}>{t('admin.addNewPatient.subtitle')}</AppText>
                  </View>
                  <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddPatient}>
                    <Ionicons name="close" size={18} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.roomNumber')}</AppText>
                    <TextInput
                      value={newPatientRoom}
                      onChangeText={setNewPatientRoom}
                      placeholder="e.g. 1204"
                      placeholderTextColor={colors.text.secondary}
                      autoCapitalize="characters"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.roomNumberHint')}</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.patientName')}</AppText>
                    <TextInput
                      value={newPatientName}
                      onChangeText={setNewPatientName}
                      placeholder="Full name of the patient"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.required')}</AppText>
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.nationalId')}</AppText>
                    <TextInput
                      value={newPatientNationalId}
                      onChangeText={setNewPatientNationalId}
                      placeholder="10-digit identifier"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.nationalIdHint')}</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.dob')}</AppText>
                    <TextInput
                      value={newPatientDob}
                      onChangeText={(text) => {
                        const digits = text.replace(/\D/g, '').slice(0, 8);
                        let formatted = digits;
                        if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
                        if (digits.length > 6) formatted = digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6);
                        setNewPatientDob(formatted);
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.dobHint')}</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.gender')}</AppText>
                    <View style={styles.adminSelectRow}>
                      {genderOptions.map((option) => {
                        const isActive = newPatientGender === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.adminSelectOption,
                              isActive && styles.adminSelectOptionActive,
                            ]}
                            onPress={() => setNewPatientGender(option)}
                          >
                            <AppText
                              style={[
                                styles.adminSelectOptionText,
                                isActive && styles.adminSelectOptionTextActive,
                              ]}
                            >
                              {option}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.role')}</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                      <AppText style={styles.adminStatusText}>{t('admin.form.roleAuto')}</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>{t('admin.form.roleHint')}</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.deviceAuto')}</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                      <AppText style={styles.adminStatusText}>{t('admin.form.deviceValue')}</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>{t('admin.form.deviceHint')}</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.status')}</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                      <AppText style={styles.adminStatusText}>{t('admin.form.statusAuto')}</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>{t('admin.form.statusAutoHint')}</AppText>
                  </View>
                </View>

                
                {newPatientMessage && (
                  <View
                    style={[
                      styles.adminFormMessage,
                      newPatientMessage.type === 'error'
                        ? styles.adminFormMessageError
                        : styles.adminFormMessageSuccess,
                    ]}
                  >
                    <AppText style={styles.adminFormMessageText}>{newPatientMessage.text}</AppText>
                  </View>
                )}

                <View style={styles.adminFormActions}>
                  <AppText style={styles.recFormHelper}>
                    {t('admin.form.patientRequired')}
                  </AppText>
                  <View style={styles.adminFormActionsRow}>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddPatient}>
                      <Ionicons name="close" size={16} color={colors.text.primary} />
                      <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminPrimaryButton} onPress={handleAddPatient}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>{t('admin.addPatient')}</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow, styles.adminColPatientShrink]}>{t('admin.table.room')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColNationalId]}>{t('admin.form.nationalId')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColPatientName]}>{t('admin.table.name')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium, styles.adminColPatientShrink]}>{t('admin.table.dob')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, styles.adminColPatientShrink]}>{t('admin.form.gender')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColPatientDevice]}>{t('admin.table.device')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, styles.adminColPatientShrink]}>{t('admin.form.status')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColPatientActions, styles.adminTableHeadRight]}>{t('admin.table.actions')}</AppText>
            </View>

            {editingPatient && (
              <View style={[styles.adminTableCard, styles.recGlassCard, styles.adminFormCard]}>
                <View style={styles.adminFormHeader}>
                  <View>
                    <AppText style={styles.adminTableTitle}>{t('admin.editPatient')}</AppText>
                    <AppText style={styles.adminTableSubtitle}>
                      {editingPatient.name} · ID {editingPatient.nationalId}
                    </AppText>
                  </View>
                  <TouchableOpacity style={styles.adminGhostButton} onPress={() => setEditingPatient(null)}>
                    <Ionicons name="close" size={18} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.roomNumber')}</AppText>
                    <TextInput
                      value={editPatientRoom}
                      onChangeText={setEditPatientRoom}
                      placeholder="Room or ward ID"
                      placeholderTextColor={colors.text.secondary}
                      autoCapitalize="characters"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>{t('admin.form.roomNumberEditHint')}</AppText>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.patientName')}</AppText>
                    <TextInput value={editPatientName} onChangeText={setEditPatientName} placeholder="Full name" placeholderTextColor={colors.text.secondary} style={styles.recFormInput} />
                  </View>
                </View>
                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.dob')}</AppText>
                    <TextInput value={editPatientDob} onChangeText={setEditPatientDob} placeholder="YYYY-MM-DD" placeholderTextColor={colors.text.secondary} style={styles.recFormInput} />
                    <AppText style={styles.recFormHelper}>{t('admin.form.dobFormat')}</AppText>
                  </View>
                </View>
                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>{t('admin.form.gender')}</AppText>
                    <View style={styles.adminSelectRow}>
                      {(['Male', 'Female'] as const).map((option) => (
                        <TouchableOpacity key={option} style={[styles.adminSelectOption, editPatientGender === option && styles.adminSelectOptionActive]} onPress={() => setEditPatientGender(option)}>
                          <AppText style={[styles.adminSelectOptionText, editPatientGender === option && styles.adminSelectOptionTextActive]}>{option}</AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                {editPatientMessage && (
                  <View style={[styles.adminFormMessage, editPatientMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess]}>
                    <AppText style={styles.adminFormMessageText}>{editPatientMessage.text}</AppText>
                  </View>
                )}
                <View style={styles.adminFormActions}>
                  <AppText style={styles.recFormHelper}>{t('admin.form.patientEditReadonly')}</AppText>
                  <View style={styles.adminFormActionsRow}>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={() => setEditingPatient(null)}>
                      <Ionicons name="close" size={16} color={colors.text.primary} />
                      <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminPrimaryButton} onPress={handleSavePatient}>
                      <Ionicons name="save-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>{t('admin.saveChanges')}</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {specPatients.map((p) => (
              <React.Fragment key={p.nationalId}>
                <View style={styles.adminTableRow}>
                  <AppText style={[styles.adminTableCell, styles.adminColNarrow, styles.adminColPatientShrink]}>
                    {p.roomNumber ?? p.room_number ?? '—'}
                  </AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColNationalId]} numberOfLines={1} ellipsizeMode="tail">
                    {p.nationalId}
                  </AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColPatientName]} numberOfLines={1} ellipsizeMode="tail">
                    {p.name}
                  </AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium, styles.adminColPatientShrink]} numberOfLines={1} ellipsizeMode="tail">
                    {p.dob ? new Date(p.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColSmall, styles.adminColPatientShrink]}>
                    {p.gender}
                  </AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColPatientDevice]} numberOfLines={1} ellipsizeMode="tail">
                    {p.device}
                  </AppText>
                  <View style={[styles.adminColSmall, styles.adminColPatientShrink]}>
                    <View style={[styles.adminStatusPill, p.status === 'Active' && styles.adminPillSuccess, p.status === 'Inactive' && styles.adminPillMuted]}>
                      <AppText style={styles.adminStatusText}>{p.status}</AppText>
                    </View>
                  </View>
                  <View style={[styles.adminTableCellActions, styles.adminColPatientActions]}>
                    <TouchableOpacity style={styles.adminIconButton} onPress={() => openEditPatient(p)}>
                      <Ionicons name="create-outline" size={18} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminIconButton}
                      onPress={async () => {
                        try {
                          const res = await fetch(`${getApiBase()}/specialist/patients/${p.nationalId}/status`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              performed_by_name: user?.name ?? 'Specialist',
                              performed_by_id: user?.id ?? 'unknown',
                            }),
                          });
                          const result = await res.json();
                          if (!res.ok) throw new Error(result.error || 'Failed to update status');
                          setSpecPatients(prev =>
                            prev.map(pt =>
                              pt.nationalId === p.nationalId
                                ? { ...pt, status: result.status === 'Active' ? 'Active' : 'Inactive' }
                                : pt
                            )
                          );
                        } catch (err: any) {
                          console.error('Status toggle failed:', err.message);
                        }
                      }}
                    >
                      <Ionicons
                        name={p.status === 'Active' ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={18}
                        color={p.status === 'Active' ? colors.status.warning : colors.logo.oceanGreen}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminIconButton}
                      onPress={() => setPatientToDelete(patientToDelete === p.nationalId ? null : p.nationalId)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {patientToDelete === p.nationalId && (
                  <View style={[styles.adminTableRow, { backgroundColor: 'rgba(220,53,69,0.08)', justifyContent: 'flex-end', gap: spacing.sm }]}>
                    <AppText style={[styles.adminTableCell, { color: colors.status.error, flex: 1 }]}>
                      {t('admin.delete')} {p.name}? {t('admin.deleteConfirm')}
                    </AppText>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={() => setPatientToDelete(null)}>
                      <AppText style={styles.adminGhostButtonText}>{t('admin.cancel')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adminPrimaryButton}
                      onPress={async () => {
                        try {
                          await deletePatient(p.nationalId, user?.name ?? 'Specialist', user?.id ?? 'unknown');
                          setSpecPatients(prev => prev.filter(pt => pt.nationalId !== p.nationalId));
                          setPatientToDelete(null);
                        } catch (err: any) {
                          setDeletePatientMessage({ type: 'error', text: err.message });
                          setPatientToDelete(null);
                        }
                      }}
                    >
                      <AppText style={styles.adminPrimaryButtonText}>{t('admin.delete')}</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </React.Fragment>
            ))}          
          </View> 
        </View>
      );
    }

    if (activeSidebarItem === 'spec-sessions') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={styles.specSessionHeader}>
            <View>
              <AppText style={styles.adminTableTitle}>{t('admin.sessionManagement')}</AppText>
              <AppText style={styles.adminTableSubtitle}>
                {t('spec.sessions.subtitle')}
              </AppText>
            </View>
            <View style={styles.specSessionControls}>
              {specPatients.filter(p => p.status === 'Active').length > 0 && (
                <View style={[styles.modelFieldControl, { minWidth: 200 }]}>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    style={{ border: 'none', background: 'transparent', fontSize: 14, color: colors.text.primary, outline: 'none', minWidth: 180 }}
                  >
                    <option value="" disabled hidden>Select an active patient</option>
                    {specPatients
                      .filter(p => p.status === 'Active')
                      .map(p => (
                        <option key={p.nationalId} value={p.nationalId}>
                          {p.name} — Room {p.roomNumber}
                        </option>
                      ))}
                  </select>
                </View>
              )}
              <TouchableOpacity
                style={[styles.adminPrimaryButton, styles.specSessionButton, createSessionLoading && { opacity: 0.7 }]}
                onPress={handleSpecCreateSessionFromInference}
                disabled={createSessionLoading}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>
                  {createSessionLoading ? 'Creating…' : 'Create Session (Demo)'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.adminTableCard}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('admin.savedSessions')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {t('spec.sessions.loadedHint')}
                </AppText>
                {specSessionsError ? (
                  <AppText style={[styles.adminTableSubtitle, { color: colors.status.error }]}>
                    {specSessionsError}
                  </AppText>
                ) : null}
              </View>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>{t('admin.table.sessionId')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.table.patient')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.table.topPredicted')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, { flexShrink: 0 }]}>{t('admin.table.avgAcc')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>{t('admin.table.device')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.time')}</AppText>
            </View>

            {specSessionsLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <AppText style={styles.adminTableSubtitle}>{t('admin.loadingSessions')}</AppText>
              </View>
            ) : specSessions.length === 0 ? (
              <View style={{ paddingVertical: 24 }}>
                <AppText style={styles.adminTableSubtitle}>
                  No sessions yet. Click “Create session (demo)” to generate one using the model.
                </AppText>
              </View>
            ) : (
              specSessions.map((s) => (
                <View key={String(s.session_id)} style={styles.adminTableRow}>
                  <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{s.session_id}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{s.patient_national_id}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{formatPredictedWord(sessionListTopWord(s, isRTL))}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColSmall, { flexShrink: 0 }]}>
                    {sessionListTopWordAvgAcc(s)}
                  </AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{s.device || '—'}</AppText>
                  <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                    {(s.end_time || s.start_time || '').replace('T', ' ').slice(0, 19) || '—'}
                  </AppText>
                </View>
              ))
            )}
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'spec-reports') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={styles.adminTableCard}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('admin.reports')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {t('admin.reports.subtitle')}
                </AppText>
              </View>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>{t('admin.table.reportId')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportPatientCol]}>{t('admin.table.patient')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportDateCol]}>{t('admin.table.dateTime')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportWordCol]}>{t('admin.table.topPredictedWord')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportAccCol]}>{t('admin.table.avgAccuracy')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportExportCol]}>{t('admin.table.export')}</AppText>
            </View>

            {specReports.map((rep) => (
              <View key={rep.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{rep.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportPatientCol]}>{rep.patient}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportDateCol]}>{rep.date}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportWordCol]}>{rep.word}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.specReportAccCol]}>{rep.accuracy}</AppText>
                <View style={[styles.specReportExportCol, styles.specReportExportActions]}>
                  <TouchableOpacity
                    style={styles.adminIconButton}
                    onPress={() => {
                      const xlsxRow = {
                        'Report ID': rep.id,
                        'Patient (National ID)': rep.patient,
                        'Date & Time': rep.date,
                        'Top Predicted Word': formatPredictedWord(rep.word),
                        'Avg Accuracy': rep.accuracy,
                      };
                      if (Platform.OS === 'web') {
                        downloadTableAsXlsx([xlsxRow], `report_${rep.id}`);
                      } else {
                        const idNum = Number(rep.session_id ?? String(rep.id).replace('REP-', ''));
                        if (Number.isFinite(idNum)) {
                          Linking.openURL(liveDemoSessionReportXlsxUrl(idNum)).catch(() => undefined);
                        }
                      }
                    }}
                  >
                    <Ionicons name="download-outline" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adminIconButton}
                    onPress={() => {
                      const idNum = Number(rep.session_id ?? String(rep.id).replace('REP-', ''));
                      if (Number.isFinite(idNum)) openRecipientReport(idNum);
                    }}
                  >
                    <Image
                      source={require('../../../assets/file.png')}
                      style={styles.specReportFileIcon}
                      accessibilityLabel="Open session report"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'spec-settings') {
      return (
        <View style={styles.adminFullWidthSection}>
          <SettingsPageGlassCard>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('spec.settings')}</AppText>
                <AppText style={styles.adminTableSubtitle}>{t('spec.settings.subtitle')}</AppText>
              </View>
              <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                <AppText style={styles.adminStatusText}>{t('spec.role')}</AppText>
              </View>
            </View>

            {profileMessage ? (
          <View style={[styles.adminFormMessage, profileMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess, { marginBottom: spacing.md }]}>
            <AppText style={styles.adminFormMessageText}>{profileMessage.text}</AppText>
          </View>
        ) : null}

        <View style={styles.recSettingsForm}>
          <View style={styles.recSettingsRow}>

            <View style={styles.recFormPanel}>
              <AppText style={styles.recPanelTitle}>{t('spec.profile')}</AppText>

              <View style={styles.recFormField}>
                <AppText style={styles.recFormLabel}>{t('admin.form.nationalId')}</AppText>
                <View style={[styles.recFormInput, { justifyContent: 'center', backgroundColor: colors.background.light }]}>
                  <AppText style={{ color: colors.text.secondary }}>{user?.id ?? '—'}</AppText>
                </View>
                <AppText style={styles.recFormHelper}>{t('admin.form.cannotChange')}</AppText>
              </View>

              <View style={styles.recFormField}>
                <AppText style={styles.recFormLabel}>{t('admin.form.fullName')}</AppText>
                <TextInput value={profileName} onChangeText={setProfileName} style={styles.recFormInput} />
                <AppText style={styles.recFormHelper}>{t('spec.profile.hint')}</AppText>
              </View>

              <View style={styles.recFormField}>
                <AppText style={styles.recFormLabel}>{t('admin.form.email')}</AppText>
                <TextInput value={profileEmail} onChangeText={setProfileEmail} keyboardType="email-address" autoCapitalize="none" style={styles.recFormInput} />
              </View>

              <View style={styles.recFormField}>
                <AppText style={styles.recFormLabel}>{t('admin.form.phone')}</AppText>
                <TextInput value={profilePhone} onChangeText={handlePhoneChange} keyboardType="number-pad" maxLength={10} placeholder="05XXXXXXXX" style={styles.recFormInput} />
              </View>

              <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }]} onPress={() => performSaveProfile(false)}>
                <Ionicons name="save-outline" size={16} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>{t('admin.saveChanges')}</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.recFormPanel}>
              <AppText style={styles.recPanelTitle}>{t('admin.profile.changePassword')}</AppText>

              <View style={styles.recFormField}>
                <AppText style={styles.recFormLabel}>{t('admin.profile.currentPassword')}</AppText>
                <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={styles.recFormInput} editable={!passwordSaving} />
              </View>

              <View style={styles.recFormField}>
                <AppText style={styles.recFormLabel}>{t('admin.profile.newPassword')}</AppText>
                <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.recFormInput} editable={!passwordSaving} />
                <AppText style={styles.recFormHelper}>{t('admin.profile.passwordHint')}</AppText>
              </View>

              {passwordMessage ? (
                <View style={[styles.adminFormMessage, passwordMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess]}>
                  <AppText style={styles.adminFormMessageText}>{passwordMessage.text}</AppText>
                </View>
              ) : null}

              <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }, passwordSaving && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={passwordSaving}>
                <Ionicons name="key-outline" size={16} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>{passwordSaving ? t('admin.profile.updating') : t('admin.profile.changePassword')}</AppText>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </SettingsPageGlassCard>
    </View>
  );
}

    // Default specialist dashboard
    return (
      <View style={styles.adminFullWidthSection}>
        <View style={styles.adminTableHeader}>
          <View>
            <AppText style={styles.adminTableTitle}>{t('spec.dashboard')}</AppText>
            <AppText style={styles.adminTableSubtitle}>
              Monitor assigned patients and sessions
            </AppText>
            {specUsingDemoHomeSessions ? (
              <AppText style={[styles.adminTableSubtitle, { marginTop: spacing.xs, opacity: 0.9 }]}>
                Session KPIs below use demo data until the API returns your saved sessions.
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={[styles.modelTopRow, { marginTop: spacing.sm }]}>
          {specKpis.map((kpi) => (
            <View key={kpi.key} style={styles.modelStatCard}>
              <AppText style={styles.modelStatLabel}>{kpi.label}</AppText>
              <AppText style={styles.modelStatValue}>{kpi.value}</AppText>
              <AppText style={styles.modelStatSub}>{kpi.sub}</AppText>
            </View>
          ))}
        </View>

        <View style={[styles.modelRow, { marginBottom: spacing.lg }]}>
          <View style={[styles.modelHalfCard, styles.specWideCard, styles.specRecentCard]}>
            <AppText style={styles.adminTableTitle}>{t('spec.recentSessions')}</AppText>
            {specUsingDemoHomeSessions ? (
              <AppText style={[styles.adminTableSubtitle, { marginBottom: spacing.xs }]}>
                Demo preview — connect the backend and save sessions to replace these rows.
              </AppText>
            ) : null}
            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>{t('admin.table.sessionId')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.patient')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('spec.table.word')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, styles.adminTableHeadRight]}>{t('spec.table.accuracy')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, styles.adminTableHeadRight]}>{t('admin.table.time')}</AppText>
            </View>
            {specRecentSessions.map((s) => (
              <View key={s.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{s.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{s.patient}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{s.word}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.adminColSmall, { flexShrink: 0 }]}>{s.accuracy}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.adminColSmall, { flexShrink: 0 }]}>{s.time}</AppText>
              </View>
            ))}
          </View>

          <View style={[styles.modelHalfCard, styles.specNarrowCard, styles.specConnectionCard]}>
            <View style={styles.specConnHeader}>
              <Ionicons name="pulse-outline" size={18} color={colors.logo.paradiso} />
              <AppText style={styles.adminTableTitle}>{specConnection.label}</AppText>
            </View>
            <View style={styles.specConnStatusRow}>
              <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                <AppText style={styles.adminStatusText}>{specConnection.value}</AppText>
              </View>
            </View>
            <View style={styles.specConnMeta}>
              <AppText style={styles.specConnMetaText}>{t('spec.device')}</AppText>
              <AppText style={styles.specConnMetaText}>{t('spec.channels')}</AppText>
              <AppText style={styles.specConnMetaText}>{t('spec.lastSync')}</AppText>
              <AppText style={styles.specConnMetaText}>{t('spec.signalQuality')}</AppText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderRecipientContent = () => {
    if (activeSidebarItem === 'rec-sessions') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('spec.mySessions')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  {t('spec.mySessions.subtitle')}
                </AppText>
              </View>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>{t('spec.table.sessionId')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>{t('admin.table.dateTime')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportWordCol]}>{t('admin.table.topPredictedWord')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportAccCol]}>{t('admin.table.avgAccuracy')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportDateCol]}>{t('spec.table.duration')}</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportExportCol]}>{t('admin.table.export')}</AppText>
            </View>

            {recSessions.map((s) => (
              <View key={s.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{s.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{s.date}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportWordCol]}>{formatPredictedWord(s.word, isRTL)}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.specReportAccCol]}>{s.accuracy}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportDateCol]}>{s.duration}</AppText>
                <View style={[styles.specReportExportCol, styles.specReportExportActions]}>
                  <TouchableOpacity
                    style={styles.adminIconButton}
                    onPress={() => {
                      const xlsxRow = {
                        'Report ID': s.id,
                        'Date & Time': s.date,
                        'Top Predicted Word': formatPredictedWord(s.word),
                        'Avg Accuracy': s.accuracy,
                        'Duration': s.duration,
                      };
                      if (Platform.OS === 'web') {
                        downloadTableAsXlsx([xlsxRow], `session_${s.id}`);
                      } else {
                        const idNum = Number(s.session_id ?? String(s.id).replace('RS-', ''));
                        if (Number.isFinite(idNum)) {
                          Linking.openURL(liveDemoSessionReportXlsxUrl(idNum)).catch(() => undefined);
                        }
                      }
                    }}
                  >
                    <Ionicons name="download-outline" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adminIconButton}
                    onPress={() => {
                      const idNum = Number(s.session_id ?? String(s.id).replace('RS-', ''));
                      if (Number.isFinite(idNum)) openRecipientReport(idNum);
                    }}
                  >
                    <Image
                      source={require('../../../assets/file.png')}
                      style={styles.specReportFileIcon}
                      accessibilityLabel="Open session report"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'rec-settings') {
      return (
        <View style={styles.adminFullWidthSection}>
          <SettingsPageGlassCard>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>{t('patient.settings')}</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Profile, alerts and security
                </AppText>
              </View>
            </View>

            <View style={styles.recSettingsForm}>
            <View style={styles.recSettingsRow}>

              <View style={styles.recFormPanel}>
                <AppText style={styles.recPanelTitle}>{t('patient.personalInfo')}</AppText>

                <View style={styles.recFormField}>
                  <AppText style={styles.recFormLabel}>{t('admin.form.nationalId')}</AppText>
                  <View style={[styles.recFormInput, { justifyContent: 'center', backgroundColor: colors.background.light }]}>
                    <AppText style={{ color: colors.text.secondary }}>{user?.id ?? '—'}</AppText>
                  </View>
                  <AppText style={styles.recFormHelper}>{t('admin.form.cannotChange')}</AppText>
                </View>

                <View style={styles.recFormField}>
                  <AppText style={styles.recFormLabel}>{t('patient.emailAddress')}</AppText>
                  <TextInput value={profileEmail} onChangeText={setProfileEmail} keyboardType="email-address" autoCapitalize="none" style={styles.recFormInput} />
                </View>

                <View style={styles.recFormField}>
                  <AppText style={styles.recFormLabel}>{t('patient.phoneNumber')}</AppText>
                  <TextInput value={profilePhone} onChangeText={handlePhoneChange} keyboardType="number-pad" maxLength={10} placeholder="05XXXXXXXX" style={styles.recFormInput} />
                </View>

                <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }]} onPress={() => performSaveProfile(false)}>
                  <Ionicons name="save-outline" size={16} color={colors.text.white} />
                  <AppText style={styles.adminPrimaryButtonText}>{t('admin.saveChanges')}</AppText>
                </TouchableOpacity>

                {profileMessage ? (
                  <View style={[styles.adminFormMessage, profileMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess, { marginTop: spacing.sm }]}>
                    <AppText style={styles.adminFormMessageText}>{profileMessage.text}</AppText>
                  </View>
                ) : null}
              </View>

              <View style={styles.recFormPanel}>
                <AppText style={styles.recPanelTitle}>{t('patient.changePassword')}</AppText>

                <View style={styles.recFormField}>
                  <AppText style={styles.recFormLabel}>{t('patient.currentPassword')}</AppText>
                  <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={styles.recFormInput} editable={!passwordSaving} />
                </View>

                <View style={styles.recFormField}>
                  <AppText style={styles.recFormLabel}>{t('patient.newPassword')}</AppText>
                  <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.recFormInput} editable={!passwordSaving} />
                  <AppText style={styles.recFormHelper}>{t('patient.passwordHint')}</AppText>
                </View>

                {passwordMessage ? (
                  <View style={[styles.adminFormMessage, passwordMessage.type === 'error' ? styles.adminFormMessageError : styles.adminFormMessageSuccess]}>
                    <AppText style={styles.adminFormMessageText}>{passwordMessage.text}</AppText>
                  </View>
                ) : null}

                <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }, passwordSaving && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={passwordSaving}>
                  <Ionicons name="key-outline" size={16} color={colors.text.white} />
                  <AppText style={styles.adminPrimaryButtonText}>{passwordSaving ? t('patient.updating') : t('patient.changePassword')}</AppText>
                </TouchableOpacity>
              </View>

            </View>
          </View>
          </SettingsPageGlassCard>
        </View>
      );
    }

    // Default recipient dashboard (keep existing patient cards, add controls in EEG card)
    return (
      <>
        <View style={styles.adminStatsGrid}>
          {recTopStats.map((stat) => (
            <View key={stat.key} style={styles.adminStatCard}>
              <View style={styles.adminStatContent}>
                <View style={[styles.adminStatIcon, { backgroundColor: stat.tint }]}>
                  <Ionicons name={stat.icon as any} size={26} color={colors.text.white} />
                </View>
                <View style={styles.adminStatTextCol}>
                  <AppText style={styles.adminStatLabel}>{stat.label}</AppText>
                  {'valueEnd' in stat && stat.valueEnd ? (
                    <View style={[styles.adminStatValueRow, styles.adminStatRecipientValueLift]}>
                      <AppText
                        style={[styles.adminStatValue, styles.adminStatValueRowEnd, styles.adminStatValueEn]}
                        numberOfLines={1}
                      >
                        {stat.valueEnd}
                      </AppText>
                      <AppText
                        style={[styles.adminStatValue, styles.adminStatValueRowEnd, styles.adminStatValueAr]}
                        numberOfLines={1}
                      >
                        {stat.value}
                      </AppText>
                    </View>
                  ) : (
                    <AppText style={[styles.adminStatValue, styles.adminStatRecipientValueLift]}>
                      {stat.value}
                    </AppText>
                  )}
                  <AppText style={styles.adminStatNote}>{stat.note}</AppText>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.analyticsRow}>
          <View style={styles.eegCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <AppText style={styles.cardTitle}>{t('patient.eegActivity')}</AppText>
                <AppText style={styles.cardSubtitle}>
                  {t('patient.eegTrend')}
                </AppText>
              </View>
              <View style={styles.recHeaderTimerCenter}>
                <AppText style={styles.recHeaderTimerText}>{eegLiveTimerLabel}</AppText>
              </View>
              <View style={styles.recHeaderRightArea}>
                <View style={styles.specSessionControls}>
                  <TouchableOpacity
                    style={[styles.adminPrimaryButton, styles.specSessionButton, eegLiveRunning && { opacity: 0.7 }]}
                    onPress={handleStartEegLive}
                    disabled={eegLiveRunning}
                  >
                    <Ionicons name="play" size={16} color={colors.text.white} />
                    <AppText style={styles.adminPrimaryButtonText}>{eegLiveRunning ? t('patient.running') : t('patient.start')}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminGhostButton, styles.specSessionButton, !eegLiveRunning && { opacity: 0.7 }]}
                    onPress={handleStopEegLive}
                    disabled={!eegLiveRunning}
                  >
                    <Ionicons name="stop" size={16} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>{t('patient.stop')}</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.graphArea}>
              <View style={styles.graphBackground}>
                <EegMiniChart
                  activityKey={eegPredictResult?.predicted_word_ar ?? '—'}
                  intensity={eegPredictResult?.confidence ?? 0}
                  running={eegLiveRunning}
                />
              </View>
              <View style={{ marginTop: spacing.md }}>
                {eegPredictError ? (
                  <AppText style={[styles.recFormHelper, { color: colors.status.error }]}>
                    {eegPredictError}
                  </AppText>
                ) : null}
                <View style={styles.recPredictionBlock}>
                  <AppText style={styles.recPredictionLabel}>{t('patient.predictedWord')}</AppText>
                  <View style={[
                    styles.recPredictionCard,
                    // If there is a result and the word is not the default dash, make it red!
                    eegPredictResult && recDashboardState.detectedWord !== '—'
                      ? { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: colors.status.error }
                      : {}
                  ]}>
                    <View style={styles.recPredictionWordRow}>
                      <View style={styles.recPredictionSideSlot} />
                      <View style={styles.recPredictionWordCenter}>
                        <Pressable
                          onPress={() => {
                            if (recDashboardState.detectedWordEn) {
                              setEegPredictWordShowEn((v) => !v);
                            }
                          }}

                          disabled={!recDashboardState.detectedWordEn}
                          style={({ pressed }) => [
                            styles.recPredictionWordPressable,
                            Boolean(recDashboardState.detectedWordEn) &&
                              pressed &&
                              styles.recPredictionWordPressablePressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !recDashboardState.detectedWordEn }}
                          accessibilityHint={
                            recDashboardState.detectedWordEn
                              ? 'Tap to switch between Arabic and English'
                              : undefined
                          }
                        >
                          <AppText
                            style={[
                              styles.recPredictionValue,
                              eegPredictWordShowEn &&
                                recDashboardState.detectedWordEn &&
                                styles.recPredictionValueLatin,
                            ]}
                          >
                            {recDashboardState.detectedWord === '—'
                              ? '—'
                              : eegPredictWordShowEn && recDashboardState.detectedWordEn
                                ? recDashboardState.detectedWordEn
                                : recDashboardState.detectedWord}
                          </AppText>
                        </Pressable>
                      </View>
                      <View style={styles.recPredictionSideSlot}>
                        {eegPredictResult &&
                        recDashboardState.detectedWord !== '—' &&
                        (eegPredictResult.confidence ?? 0) >= EEG_HIGH_CONF_ALERT_THRESHOLD ? (
                          <View style={styles.recPredictionAlertIconWrap}>
                            <Image
                              source={require('../../../assets/warning.png')}
                              style={styles.recPredictionWarningIcon}
                              accessibilityLabel="High confidence alert"
                            />
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <AppText style={styles.recPredictionFooter}>
                      {recDashboardState.confidenceLabel !== '—' ? `Confidence: ${recDashboardState.confidenceLabel}` : ' '}
                    </AppText>
                    {recDashboardState.detectedWord !== '—'
                      ? (() => {
                          const sentenceAr = liveDemoHighConfSentenceAr(recDashboardState.detectedWord);
                          return sentenceAr ? (
                            <AppText style={styles.recPredictionHighConfMatch}>{sentenceAr}</AppText>
                          ) : null;
                        })()
                      : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom row: calendar, appointments, session history
        <View style={styles.bottomRow}>
          <View style={[styles.bottomCard, { flex: 2 }]}>
            <AppText style={styles.bottomCardTitle}>Calendar</AppText>
            <AppText style={styles.bottomCardSubtitle}>
              Upcoming EEG session dates
            </AppText>
            <View style={styles.calendarHeaderRow}>
              <AppText style={styles.calendarHeaderLabel}>
                {calendarLabel}
              </AppText>
              <View style={styles.calendarTodayPill}>
                <AppText style={styles.calendarTodayText}>Today</AppText>
              </View>
            </View>
            <View style={styles.calendarWeekdayRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <AppText key={`${d}-${idx}`} style={styles.calendarWeekdayText}>
                  {d}
                </AppText>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarWeeks.map((week, wi) => (
                <View key={wi} style={styles.calendarWeekRow}>
                  {week.map((day, di) => {
                    const isToday =
                      day != null && day === todayDate;
                    return (
                      <View
                        key={`${wi}-${di}`}
                        style={[
                          styles.calendarDayCell,
                          isToday && styles.calendarDayCellToday,
                        ]}
                      >
                        {day != null && (
                          <AppText
                            style={[
                              styles.calendarDayText,
                              isToday && styles.calendarDayTextToday,
                            ]}
                          >
                            {day}
                          </AppText>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomCard}>
            <AppText style={styles.bottomCardTitle}>Session history</AppText>
            <AppText style={styles.bottomCardSubtitle}>
              Words used across recent sessions
            </AppText>
            <View style={styles.phraseList}>
              {quickWords.map((word) => (
                <View key={word.key} style={styles.phraseRow}>
                  <View style={styles.phraseMain}>
                    <AppText style={styles.phraseWord}>
                      {word.label}
                    </AppText>
                    <AppText style={styles.phraseMeta}>
                      {word.count}x today · Last used {word.lastUsed}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.phraseBadge,
                      { backgroundColor: word.badgeColor },
                    ]}
                  >
                    <AppText style={styles.phraseBadgeText}>
                      {word.label}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View> */}
      </>
    );
  };
  // Keep sidebar selection aligned to role changes
  useEffect(() => {
    if (isAdmin && !activeSidebarItem.startsWith('admin')) {
      setActiveSidebarItem('admin-dashboard');
    } else if (role === 'specialist' && !activeSidebarItem.startsWith('spec')) {
      setActiveSidebarItem('spec-dashboard');
    } else if (isUser && !activeSidebarItem.startsWith('rec')) {
      setActiveSidebarItem('rec-dashboard');
    } else if (!isAdmin && activeSidebarItem.startsWith('admin')) {
      setActiveSidebarItem('rec-dashboard');
    } else if (role !== 'specialist' && activeSidebarItem.startsWith('spec')) {
      setActiveSidebarItem('rec-dashboard');
    }
  }, [isAdmin, role, activeSidebarItem]);

  const quickWords = [
    {
      key: 'help',
      label: t('patient.help'),
      icon: 'alert-circle-outline' as const,
      badgeColor: colors.status.error,
      lastUsed: '2 min ago',
      count: 4,
    },
    {
      key: 'pain',
      label: t('patient.pain'),
      icon: 'medkit-outline' as const,
      badgeColor: colors.patient.warning,
      lastUsed: '5 min ago',
      count: 3,
    },
    {
      key: 'hungry',
      label: t('patient.hungry'),
      icon: 'fast-food-outline' as const,
      badgeColor: colors.primary[400],
      lastUsed: '20 min ago',
      count: 2,
    },
    {
      key: 'thirsty',
      label: t('patient.thirsty'),
      icon: 'water-outline' as const,
      badgeColor: colors.logo.paradiso,
      lastUsed: '10 min ago',
      count: 5,
    },
    {
      key: 'bathroom',
      label: t('patient.bathroom'),
      icon: 'male-female-outline' as const,
      badgeColor: colors.primary[700],
      lastUsed: '45 min ago',
      count: 1,
    },
  ];

  // Simple calendar data (current month with today highlighted)
  const today = new Date();
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth(); // 0-11
  const calendarLabel = today.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const todayDate = today.getDate();

  const generateCalendarWeeks = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];
    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    // Pad to full weeks
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  };

  const calendarWeeks = generateCalendarWeeks(calendarYear, calendarMonth);

  useEffect(() => {
    const targetWidth = !isSmallScreen && sidebarOpen ? SIDEBAR_BASE_WIDTH : 0;
    Animated.timing(sidebarAnim, {
      toValue: targetWidth,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sidebarOpen]);

  const headerLogo = (
    <TouchableOpacity
      style={styles.headerLeft}
      onPress={() => {
        if (isAdmin) setActiveSidebarItem('admin-dashboard');
        else if (role === 'specialist') setActiveSidebarItem('spec-dashboard');
        else setActiveSidebarItem('rec-dashboard');
      }}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        onPress={() => setSidebarOpen((prev) => !prev)}
        activeOpacity={0.7}
        style={styles.menuButton}
      >
        <MenuBurgerIcon size={24} color={colors.text.primary} />
      </TouchableOpacity>
      {isUser ? (
        <View style={[styles.recipientBrandRow, isRTL && styles.recipientBrandRowRtl]}>
          <Logo
            variant="icon"
            background="transparent"
            size={isSmallScreen ? 'small' : 'medium'}
            style={isRTL ? styles.recipientLogoRtl : undefined}
          />
          <View
            style={[
              styles.recipientBrandTextColumn,
              isRTL && styles.recipientBrandTextColumnRtl,
            ]}
          >
            <AppText
              style={[
                styles.headerTitle,
                styles.recipientTitleText,
                isRTL && styles.recipientTitleTextRtl,
              ]}
              skipLanguageFont
            >
              {t('header.brand')}
            </AppText>
            <AppText
              style={[
                styles.headerSlogan,
                styles.recipientTaglineText,
                isRTL && styles.recipientTaglineTextRtl,
              ]}
              skipLanguageFont
            >
              {t('header.tagline')}
            </AppText>
          </View>
        </View>
      ) : (
        <>
          <Logo
            variant="icon"
            background="transparent"
            size={isSmallScreen ? 'small' : 'medium'}
            style={styles.headerLogo}
          />
          <View style={styles.headerTextContainer}>
            <AppText style={styles.headerTitle}>{t('header.title')}</AppText>
            <AppText style={styles.headerSlogan}>{t('header.slogan')}</AppText>
          </View>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Shared soft gradient + orb particles (Landing/Login/Dashboard) */}
      <AppBackground />

      <AppHeader
        logo={headerLogo}
        showLogo={false}
        showNotifications={isUser || role === 'patient' || role === 'specialist'}
      />

      {/* Main dashboard layout */}
      <View style={styles.screenContent}>
        <View style={styles.mainRow}>
          {/* Sidebar (shared for all roles) - toggled via header menu */}
          {!isSmallScreen && (
            <Animated.View
              style={[
                styles.sidebarWrapper,
                {
                  width: sidebarAnim,
                  opacity: sidebarAnim.interpolate({
                    inputRange: [0, SIDEBAR_BASE_WIDTH * 0.4, SIDEBAR_BASE_WIDTH],
                    outputRange: [0, 0.4, 1],
                  }),
                },
                { pointerEvents: sidebarOpen ? 'auto' : 'none' },
              ]}
            >
              <Sidebar
                activeItem={activeSidebarItem}
                onSelect={setActiveSidebarItem}
                roleLabel={roleLabel}
                variant={
                  isAdmin
                    ? 'admin'
                    : role === 'specialist'
                    ? 'specialist'
                    : role === 'RegisteredUser'
                    ? 'recipient'
                    : 'default'
                }
              />
            </Animated.View>
          )}

          {/* Scrollable main content column */}
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {isUser ? (
              renderRecipientContent()
            ) : isAdmin ? (
              renderAdminContent()
            ) : role === 'specialist' ? (
              renderSpecialistContent()
            ) : (
              renderRecipientContent()
            )}
          </ScrollView>
        </View>
      </View>
      <Modal visible={recReportOpen} transparent animationType="fade" onRequestClose={() => setRecReportOpen(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setRecReportOpen(false)}>
                <Pressable style={styles.modalCard} onPress={() => undefined}>
                  <View style={styles.modalHeaderRow}>
                    <AppText style={styles.modalTitle}>{t('report.title')}</AppText>
                    <TouchableOpacity style={styles.adminIconButton} onPress={() => setRecReportOpen(false)}>
                      <Ionicons name="close" size={18} color={colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.modalTitleDivider} />
                  {recReportLoading ? (
                    <AppText style={styles.adminTableSubtitle}>{t('report.loading')}</AppText>
                  ) : recReportError ? (
                    <AppText style={[styles.adminTableSubtitle, { color: colors.status.error }]}>{recReportError}</AppText>
                  ) : recReport ? (
                    <ScrollView
                      style={styles.reportModalScroll}
                      contentContainerStyle={styles.reportModalScrollContent}
                      showsVerticalScrollIndicator={false}
                      showsHorizontalScrollIndicator={false}
                      bounces={false}
                    >
                      {(() => {
                        const counts = recReport.word_counts || {};
                        const entries = Object.entries(counts);
                        const totalPred = (recReport.events || []).length;
                        const most = entries.sort((a, b) => b[1] - a[1])[0];
                        const mostWord = most?.[0] || recReport.most_repeated_word || '—';
                        const mostCount = most?.[1] ?? 0;
                        const avgConfLabel =
                          recReport.avg_confidence != null ? `${Math.round(recReport.avg_confidence * 100)}%` : '—';
                        const startLabel = recReport.start_time
                          ? new Date(recReport.start_time).toLocaleString('en-GB', { hour12: false })
                          : '—';
                        const endLabel = recReport.end_time
                          ? new Date(recReport.end_time).toLocaleString('en-GB', { hour12: false })
                          : '—';
                        const durationLabel = recReport.duration_seconds != null
                          ? (() => {
                              const s = Math.max(0, recReport.duration_seconds);
                              const h = Math.floor(s / 3600);
                              const m = Math.floor((s % 3600) / 60);
                              const sec = s % 60;
                              return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                            })()
                          : '—';

                        return (
                          <>
                            <AppText style={styles.reportSectionTitle}>{t('report.sessionInfo')}</AppText>
                            <View style={styles.reportSectionGroup}>
                              <View style={styles.reportFieldStack}>
                                <View style={styles.reportSheetField}>
                                  <AppText style={styles.recFormLabel}>{t('report.sessionId')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{String(recReport.session_id)}</AppText>
                                  </View>
                                </View>
                                <View style={styles.reportSheetField}>
                                  <AppText style={styles.recFormLabel}>{t('report.start')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{startLabel}</AppText>
                                  </View>
                                </View>
                                <View style={styles.reportSheetField}>
                                  <AppText style={styles.recFormLabel}>{t('report.end')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{endLabel}</AppText>
                                  </View>
                                </View>
                                <View style={[styles.reportSheetField, styles.reportSheetFieldLast]}>
                                  <AppText style={styles.recFormLabel}>{t('report.duration')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{durationLabel}</AppText>
                                  </View>
                                </View>
                              </View>
                            </View>

                            <AppText style={[styles.reportSectionTitle, { marginTop: spacing.md }]}>
                              {t('report.predictions')}
                            </AppText>
                            <View style={styles.reportFieldStack}>
                              {(recReport.events || []).map((ev, idx) => (
                                <View key={`${ev.event_time}-${idx}`} style={styles.reportPredictionCard}>
                                  <AppText style={styles.reportPredictionMeta}>{t('report.prediction')}{idx + 1}</AppText>
                                  <AppText style={styles.recFormLabel}>{t('report.predictedWord')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{translateWord(ev.detected_word, isRTL)}</AppText>
                                  </View>
                                  <AppText style={[styles.recFormLabel, { marginTop: spacing.sm }]}>{t('report.time')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{ev.elapsed}</AppText>
                                    {ev.day ? (
                                      <AppText style={styles.reportValueShellSub}>{ev.day}</AppText>
                                    ) : null}
                                  </View>
                                  <AppText style={[styles.recFormLabel, { marginTop: spacing.sm }]}>{t('report.confidence')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>
                                      {ev.confidence != null ? `${Math.round(ev.confidence * 100)}%` : '—'}
                                    </AppText>
                                  </View>
                                </View>
                              ))}
                            </View>

                            <AppText style={[styles.reportSectionTitle, { marginTop: spacing.md }]}>
                              {t('report.summary')}
                            </AppText>
                            <View style={styles.reportSectionGroup}>
                              <View style={styles.reportFieldStack}>
                                <View style={styles.reportSheetField}>
                                  <AppText style={styles.recFormLabel}>{t('report.mostPredictedWord')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>
                                      {mostWord} ({mostCount})
                                    </AppText>
                                  </View>
                                </View>
                                <View style={styles.reportSheetField}>
                                  <AppText style={styles.recFormLabel}>{t('report.totalPredictions')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{String(totalPred)}</AppText>
                                  </View>
                                </View>
                                <View style={[styles.reportSheetField, styles.reportSheetFieldLast]}>
                                  <AppText style={styles.recFormLabel}>{t('report.avgConfidence')}</AppText>
                                  <View style={styles.reportValueShell}>
                                    <AppText style={styles.reportValueShellText}>{avgConfLabel}</AppText>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </>
                        );
                      })()}
                    </ScrollView>
                  ) : null}
                </Pressable>
              </Pressable>
        </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  screenContent: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 0 : spacing.xl,
    paddingLeft: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  recipientBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.lg,
    flex: 1,
  },
  recipientBrandRowRtl: {
    flexDirection: 'row-reverse',
  },
  recipientLogoRtl: {
    transform: [{ scaleX: -1 }],
  },
  recipientBrandTextColumn: {
    flexDirection: 'column',
    alignItems: isNarrowHeaderBrand ? 'center' : 'flex-start',
  },
  recipientBrandTextColumnRtl: {
    alignItems: isNarrowHeaderBrand ? 'center' : 'flex-end',
  },
  recipientTitleText: {
    textAlign: isNarrowHeaderBrand ? 'center' : 'left',
  },
  recipientTitleTextRtl: {
    textAlign: isNarrowHeaderBrand ? 'center' : 'right',
    paddingBottom: 4,
  },
  recipientTaglineText: {
    textAlign: isNarrowHeaderBrand ? 'center' : 'left',
  },
  recipientTaglineTextRtl: {
    textAlign: isNarrowHeaderBrand ? 'center' : 'right',
  },
  headerLogo: {
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    ...(Platform.OS === 'web' && {
      fontSize: 24,
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }),
  },
  headerSlogan: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    ...(Platform.OS === 'web' && {
      fontSize: 11,
      backgroundImage: `linear-gradient(135deg, ${colors.logo.chambray}, ${colors.logo.calypso}, ${colors.logo.paradiso}, ${colors.logo.oceanGreen}, ${colors.logo.emerald}, ${colors.logo.chambray})`,
      backgroundSize: '200% 200%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }),
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  sidebarWrapper: {
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    ...(Platform.OS === 'web'
      ? {
          paddingTop: HEADER_HEIGHT_WEB + spacing.sm,
        }
      : {
          paddingTop: spacing.xl,
        }),
  },
  analyticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  eegCard: {
    flexGrow: 2,
    minWidth: 260,
    backgroundColor: colors.background.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 10px 26px rgba(56,131,141,0.12)',
        }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  cardHeaderRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 180,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  graphArea: {
    marginTop: spacing.sm,
  },
  graphBackground: {
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.logo.chambray,
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bandItem: {
    flex: 1,
  },
  bandLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  bandBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 216, 179, 0.25)', // vistaBlue tint
    overflow: 'hidden',
  },
  bandBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.logo.oceanGreen,
  },
  graphFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  graphFooterLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  graphFooterValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.logo.oceanGreen,
  },
  sideStatsColumn: {
    flexGrow: 1,
    minWidth: 220,
    gap: spacing.md,
  },
  sideStatCard: {
    backgroundColor: colors.background.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 10px 24px rgba(71, 190, 127, 0.17)',
        }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 5,
        }),
  },
  sideStatLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  sideStatValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.logo.chambray,
    marginBottom: spacing.xs / 2,
  },
  sideStatValueAccent: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.logo.oceanGreen,
    marginBottom: spacing.xs / 2,
  },
  sideStatHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bottomCard: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: colors.background.white,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 14px 32px rgba(55, 93, 152, 0.16)',
        }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  bottomCardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  bottomCardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  bottomList: {
    gap: spacing.xs,
  },
  bottomItemPrimary: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  bottomItemSecondary: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  appointmentTimeline: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  appointmentItem: {
    flexDirection: 'row',
  },
  appointmentIndicatorCol: {
    width: 26,
    alignItems: 'center',
  },
  appointmentLine: {
    flex: 1,
    width: 4,
    backgroundColor: colors.primary[100],
    marginTop: 2,
  },
  appointmentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.primary[200],
    backgroundColor: colors.background.white,
  },
  appointmentDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.logo.oceanGreen,
  },
  appointmentContentCol: {
    flex: 1,
    paddingLeft: spacing.lg,
  },
  appointmentTime: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  appointmentTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  appointmentMeta: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginTop: 6,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calendarHeaderLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  calendarTodayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.logo.swansDown,
  },
  calendarTodayText: {
    fontSize: typography.sizes.xs,
    color: colors.logo.chambray,
    fontWeight: typography.weights.semibold,
  },
  calendarWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  calendarWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  calendarGrid: {
    gap: spacing.xs / 2,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  calendarDayCellToday: {
    backgroundColor: colors.logo.oceanGreen,
  },
  calendarDayText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  calendarDayTextToday: {
    color: colors.text.white,
    fontWeight: typography.weights.semibold,
  },
  phraseList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  phraseMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  phraseWord: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  phraseMeta: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  phraseBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  phraseBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.text.white,
    fontWeight: typography.weights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 180,
    maxWidth: 260,
    backgroundColor: colors.background.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 10px 24px rgba(71, 190, 127, 0.15)',
        }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.logo.chambray,
    marginBottom: spacing.xs,
  },
  statValueAccent: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.logo.oceanGreen,
    marginBottom: spacing.xs,
  },
  statHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  panel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 18px 40px rgba(55, 93, 152, 0.14)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          elevation: 6,
        }),
  },
  panelHeader: {
    marginBottom: spacing.md,
  },
  panelTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  panelSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  adminTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  adminChartRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  adminMainColumn: {
    flex: 1,
    minWidth: 320,
    gap: spacing.md,
  },
  adminSideColumn: {
    width: isSmallScreen ? '100%' : 320,
    gap: spacing.md,
  },
  adminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  adminStatCard: {
    flexGrow: 1,
    minWidth: 200,
    backgroundColor: colors.background.white,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 10px 26px rgba(56,131,141,0.12)',
        }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  adminStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  adminStatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  adminStatTextCol: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  adminStatLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  adminStatValue: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 4,
  },
  /** Recipient stat cards: lift main value toward icon vertical center (same for single + dual line). */
  adminStatRecipientValueLift: {
    marginTop: -6,
  },
  adminStatValueRow: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.xs / 4,
  },
  adminStatValueRowEnd: {
    flexShrink: 1,
    marginBottom: 0,
  },
  adminStatValueEn: {
    color: colors.text.secondary,
    textAlign: 'left',
  },
  adminStatValueAr: {
    textAlign: 'right',
  },
  adminStatNote: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  adminTableCard: {
    backgroundColor: colors.background.white,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 16px 36px rgba(55,93,152,0.14)',
        }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 14,
          elevation: 5,
        }),
  },
  adminTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  adminFullWidthSection: {
    width: '100%',
    flex: 1,
    minHeight: height * 0.8,
  },
  adminFullWidthCard: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 700,
  },
  /** Settings hub: frosted shell + particles (aligned with AppHeader glass language). */
  settingsGlassShell: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor:
      Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.26)',
    borderColor:
      Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.42)' : colors.primary[100],
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 18px 44px rgba(55, 93, 152, 0.12)',
        }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 5,
        }),
  },
  settingsParticlesWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  settingsGlassShimmer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
  settingsGlassInner: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
    gap: spacing.sm,
  },
  specSessionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  specSessionButton: {
    marginTop: 0,
  },
  specSessionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  specLiveCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: colors.background.white,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 14px 32px rgba(55, 93, 152, 0.14)' }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 5,
        }),
  },
  specLiveHeader: {
    marginBottom: spacing.xs,
  },
  specSideCard: {
    flex: 1,
    minWidth: 280,
    gap: spacing.md,
  },
  specDetectedCard: {
    backgroundColor: colors.background.light,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  specDetectedLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  specDetectedWord: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  specDetectedSub: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  eegGraph: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.logo.chambray,
    padding: spacing.xs,
    marginTop: spacing.lg,
  },
  confidenceBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148,216,179,0.3)',
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.logo.oceanGreen,
  },
  specNotesCard: {
    backgroundColor: colors.background.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
  },
  specNotesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: 12,
    padding: spacing.sm,
    textAlignVertical: 'top',
    color: colors.text.primary,
  },
  recSettingsForm: {
    gap: spacing.md,
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  recGlassCard: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 18px 40px rgba(55, 93, 152, 0.14)',
        }
      : {
          shadowColor: 'rgba(55,93,152,0.55)',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 6,
        }),
  },
  recSettingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  recFormField: {
    gap: spacing.xs / 2,
  },
  recFormLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  recFormInput: {
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    backgroundColor: colors.background.white,
  },
  recFormValue: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  recFormHelper: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  recPredictionBlock: {
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recPredictionLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recPredictionCard: {
    minWidth: 240,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)' } as any)
      : ({
          shadowColor: '#0f172a',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        } as any)),
  },
  recPredictionWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  recPredictionSideSlot: {
    width: EEG_ALERT_ICON_SLOT,
    minWidth: EEG_ALERT_ICON_SLOT,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recPredictionWordPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  recPredictionWordPressablePressed: {
    opacity: 0.88,
  },
  /** When showing English gloss, avoid forcing RTL on Latin text (Android). */
  recPredictionValueLatin: {
    ...(Platform.OS !== 'web' && { writingDirection: 'ltr' as const }),
  },
  recPredictionWordCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  recPredictionAlertIconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recPredictionWarningIcon: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  recPredictionValue: {
    fontSize: 40,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 52,
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  recPredictionFooter: {
    marginTop: 10,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    opacity: 0.9,
  },
  recPredictionHighConfMatch: {
    marginTop: 8,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
    ...(Platform.OS !== 'web' && { writingDirection: 'rtl' as const }),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: colors.background.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary[100],
    padding: spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitleDivider: {
    height: 1,
    backgroundColor: colors.primary[100],
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  reportSectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reportModalScroll: {
    maxHeight: 520,
    ...(Platform.OS === 'web'
      ? { scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const }
      : {}),
  },
  reportModalScrollContent: {
    paddingBottom: spacing.md,
  },
  reportFieldStack: {
    gap: 0,
  },
  reportSectionGroup: {
    borderWidth: 1,
    borderColor: 'rgba(55, 93, 152, 0.22)',
    borderRadius: 14,
    padding: spacing.md,
    backgroundColor: colors.background.white,
  },
  reportSheetField: {
    marginBottom: spacing.md,
  },
  reportSheetFieldLast: {
    marginBottom: 0,
  },
  reportValueShell: {
    borderWidth: 1,
    borderColor: 'rgba(55, 93, 152, 0.18)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.white,
    marginTop: spacing.xs,
  },
  reportValueShellText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  reportValueShellSub: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 4,
  },
  reportPredictionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(55, 93, 152, 0.22)',
    backgroundColor: colors.background.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reportPredictionMeta: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.logo.paradiso,
    marginBottom: spacing.sm,
  },
  recHeaderRightArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap' as any,
  },
  recHeaderTimerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  recHeaderTimerText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  recPanelTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  recFormPanel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.background.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary[100],
    padding: spacing.md,
    gap: spacing.sm,
  },
  recDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.background.white,
  },
  recDeviceTitle: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  recDeviceSub: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  recDeviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recFormActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  recFormHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  recSaveButton: {
    alignSelf: 'flex-end',
  },
  recDashHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  recControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  recStatusCol: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220,
  },
  recInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  recInfoCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.background.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 14px 32px rgba(55, 93, 152, 0.14)' }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  recAlertText: {
    fontSize: typography.sizes.base,
    color: colors.status.error,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs / 2,
  },
  specWideCard: {
    flex: 5.5,
    minWidth: 680,
  },
  specNarrowCard: {
    flex: 1.2,
    minWidth: 240,
  },
  specRecentCard: {
    minHeight: 260,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  specConnectionCard: {
    maxWidth: 280,
    minHeight: 260,
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  specConnStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  specConnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  specConnMeta: {
    gap: spacing.xs,
  },
  specConnMetaText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  specSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modelTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modelStatCard: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: colors.background.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 10px 26px rgba(56,131,141,0.12)' }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  adminTableTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  adminTableSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  adminTableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  adminTableHeadText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  adminTableHeadRight: {
    textAlign: 'right',
  },
  adminTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,232,240,0.6)',
  },
  adminFormCard: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  adminFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  adminFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  adminFormField: {
    flex: 1,
    minWidth: 260,
    gap: spacing.xs / 2,
  },
  adminSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55,93,152,0.12)',
    backgroundColor: colors.background.white,
    marginBottom: spacing.md,
  },
  adminSearchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  adminTableCell: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  adminSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  adminSelectOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.background.white,
  },
  adminSelectOptionActive: {
    backgroundColor: colors.logo.oceanGreen,
    borderColor: colors.logo.oceanGreen,
  },
  adminSelectOptionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  adminSelectOptionTextActive: {
    color: colors.text.white,
  },
  
  adminTableCellRight: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    textAlign: 'right',
  },
  specReportWordCol: {
    flex: 1.0,
    textAlign: 'center',
  },
  specReportAccCol: {
    flex: 0.55,
    textAlign: 'center',
    paddingRight: spacing.sm,
    writingDirection: 'ltr',
  },
  specReportExportCol: {
    flex: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  specReportExportActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  /** Tinted to `colors.text.primary` like `download-outline`; use a simple / mostly-alpha PNG for best results. */
  specReportFileIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    tintColor: colors.text.primary,
  },
  specReportPatientCol: {
    flex: 0.9,
  },
  specReportDateCol: {
    flex: 0.9,
    textAlign: 'center',
  },
  adminTableCellActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  adminFormMessage: {
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
  },
  adminFormMessageError: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderColor: colors.status.error,
  },
  adminFormMessageSuccess: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: colors.status.success,
  },
  adminFormMessageText: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  adminFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  adminFormActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  adminSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.background.light,
  },
  adminSettingTextCol: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  adminSettingLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  adminSettingHelper: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  adminSettingInput: {
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 140,
    maxWidth: 180,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    backgroundColor: colors.background.white,
    textAlign: 'right',
  },
  adminSettingsPanel: {
    gap: spacing.sm,
    borderColor: 'rgba(55,93,152,0.18)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 14px 30px rgba(55,93,152,0.1)' }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  adminChartSide: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  /** Equal columns for System Health + Active Model; wraps when too narrow. */
  adminSideBySideCol: {
    flex: 1,
    minWidth: 280,
    alignSelf: 'stretch',
  },
  adminCardFillHeight: {
    flex: 1,
  },
  modelStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modelStatLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  modelStatValue: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  modelStatSub: {
    fontSize: typography.sizes.sm,
    color: colors.logo.oceanGreen,
  },
  modelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'stretch',
    marginBottom: spacing.sm,
  },
  modelHalfCard: {
    flexGrow: 1,
    minWidth: 300,
    backgroundColor: colors.background.white,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 14px 32px rgba(55, 93, 152, 0.14)' }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 5,
        }),
  },
  modelInfoField: {
    marginTop: spacing.md,
  },
  modelField: {
    marginTop: spacing.md,
  },
  modelFieldLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  modelFieldControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.light,
  },
  modelFieldValue: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  modelFieldHint: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  adminColWide: { flex: 2 },
  adminColMedium: { flex: 1.2 },
  adminColGender: { flex: 0.75, minWidth: 52 },
  adminColSmall: { flex: 0.9 },
  adminColNarrow: { flex: 0.7 },
  /** Patient table: gap before name; minWidth 0 so row can shrink without clipping actions */
  adminColNationalId: {
    flex: 0.95,
    minWidth: 0,
    flexShrink: 1,
    paddingRight: spacing.md,
  },
  /** Patient table: three icon buttons need a fixed slice so they stay inside the card */
  adminColPatientActions: {
    width: 120,
    minWidth: 120,
    flexGrow: 0,
    flexShrink: 0,
  },
  adminColPatientName: {
    flex: 1.35,
    minWidth: 0,
    flexShrink: 1,
  },
  adminColPatientDevice: {
    flex: 1.15,
    minWidth: 0,
    flexShrink: 1,
  },
  /** Merged on patient table flex columns so text can shrink instead of pushing actions off-screen */
  adminColPatientShrink: {
    minWidth: 0,
    flexShrink: 1,
  },
  adminStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.primary[50],
    alignSelf: 'flex-start',
  },
  adminPillSuccess: {
    backgroundColor: 'rgba(58,171,131,0.15)',
  },
  adminPillWarning: {
    backgroundColor: 'rgba(245,158,11,0.18)',
  },
  adminPillInfo: {
    backgroundColor: 'rgba(56,131,141,0.16)',
  },
  adminPillMuted: {
    backgroundColor: 'rgba(161,181,206,0.25)',
  },
  adminStatusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  adminGhostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[100],
    backgroundColor: colors.background.white,
  },
  adminGhostButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  adminCard: {
    backgroundColor: colors.background.white,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: spacing.sm,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 14px 30px rgba(56,131,141,0.12)' }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  adminCardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  adminCardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  adminHealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adminStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[100],
  },
  adminDotSuccess: { backgroundColor: colors.status.success },
  adminDotWarning: { backgroundColor: colors.status.warning },
  adminDotInfo: { backgroundColor: colors.status.info },
  adminHealthTextCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  adminHealthLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  adminHealthValue: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold,
  },
  adminModelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  adminModelLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  adminModelValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  adminPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.logo.oceanGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  adminPrimaryButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.white,
    fontWeight: typography.weights.semibold,
  },
  adminIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
});

