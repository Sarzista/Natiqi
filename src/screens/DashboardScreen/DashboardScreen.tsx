/**
 * Dashboard Screen
 * Displays dashboards for different roles.
 * - Clinician/Admin: patient overview list
 * - Patient: personal EEG communication dashboard
 */
import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import type { DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedRe, {
  Easing as ReEasing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import { AppHeader } from '../../components/AppHeader';
import { PatientCard } from '../../components/PatientCard';
import { AppText } from '../../components/AppText';
import { Sidebar, type SidebarItemKey } from '../../components/Sidebar/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo/Logo';
import { AnimatedGradient } from '../../components/AnimatedGradient';
import { AppBackground } from '../../components/AppBackground';
import { EegMiniChart } from '../../components/EegMiniChart';
import { getPatients } from '../../services/patientService';
import { Patient, UserRole } from '../../types';
import { RootStackParamList } from '../../types/navigation';
import { colors, spacing, typography } from '../../theme';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 960;
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

const INITIAL_ADMIN_USERS = [
  {
    id: '1001',
    name: 'Dr. Rabab Alkhalifa',
    role: 'Specialist',
    email: 'rabab@natiqi.com',
    status: 'active',
    nationalId: '1029384756',
    gender: 'Female',
  },
  {
    id: '2045',
    name: 'Sarah Al-Ahmed',
    role: 'Patient',
    email: 'sarah@email.com',
    status: 'active',
    nationalId: '2103984756',
    gender: 'Female',
  },
  {
    id: '3002',
    name: 'Omar Al-Mutairi',
    role: 'Specialist',
    email: 'omar@natiqi.com',
    status: 'inactive',
    nationalId: '3092847561',
    gender: 'Male',
  },
  {
    id: '4010',
    name: 'Laila Al-Qahtani',
    role: 'Admin',
    email: 'laila@natiqi.com',
    status: 'active',
    nationalId: '4102938475',
    gender: 'Female',
  },
  {
    id: '5015',
    name: 'Hassan Al-Dosari',
    role: 'Specialist',
    email: 'hassan@natiqi.com',
    status: 'inactive',
    nationalId: '5203948576',
    gender: 'Male',
  },
  {
    id: '6021',
    name: 'Maha Al-Salem',
    role: 'Patient',
    email: 'maha@email.com',
    status: 'active',
    nationalId: '6302948571',
    gender: 'Female',
  },
  {
    id: '7028',
    name: 'Yousef Al-Harbi',
    role: 'Specialist',
    email: 'yousef@natiqi.com',
    status: 'active',
    nationalId: '7401928374',
    gender: 'Male',
  },
  {
    id: '8033',
    name: 'Noura Al-Jasser',
    role: 'Admin',
    email: 'noura@natiqi.com',
    status: 'inactive',
    nationalId: '8501928375',
    gender: 'Female',
  },
];

const INITIAL_SPEC_PATIENTS = [
  { id: 'P-1001', name: 'Sarah Al-Ahmed', dob: '1990-02-14', gender: 'Female', device: 'Emotiv EPOC X', status: 'Active', nationalId: '1029384756' },
  { id: 'P-1002', name: 'Omar Al-Mutairi', dob: '1985-11-02', gender: 'Male', device: 'Emotiv EPOC X', status: 'Active', nationalId: '2938475610' },
  { id: 'P-1003', name: 'Laila Al-Qahtani', dob: '1993-07-19', gender: 'Female', device: 'Emotiv EPOC X', status: 'Inactive', nationalId: '3847561029' },
  { id: 'P-1004', name: 'Fatima Youssef', dob: '1998-04-06', gender: 'Female', device: 'Emotiv EPOC X', status: 'Suspended', nationalId: '4756102938' },
  { id: 'P-1005', name: 'Maha Al-Salem', dob: '1994-03-12', gender: 'Female', device: 'Emotiv EPOC X', status: 'Active', nationalId: '5610293847' },
  { id: 'P-1006', name: 'Yousef Al-Harbi', dob: '1989-09-21', gender: 'Male', device: 'Emotiv EPOC X', status: 'Active', nationalId: '6102938475' },
  { id: 'P-1007', name: 'Noura Al-Jasser', dob: '1991-01-30', gender: 'Female', device: 'Emotiv EPOC X', status: 'Inactive', nationalId: '7293847561' },
  { id: 'P-1008', name: 'Hassan Al-Dosari', dob: '1987-05-18', gender: 'Male', device: 'Emotiv EPOC X', status: 'Suspended', nationalId: '8475610293' },
  { id: 'P-1009', name: 'Lama Al-Khalifa', dob: '1996-12-08', gender: 'Female', device: 'Emotiv EPOC X', status: 'Active', nationalId: '9561029384' },
  { id: 'P-1010', name: 'Adel Al-Qahtan', dob: '1983-07-04', gender: 'Male', device: 'Emotiv EPOC X', status: 'Active', nationalId: '1029384755' },
  { id: 'P-1011', name: 'Rania Al-Faisal', dob: '1992-10-23', gender: 'Female', device: 'Emotiv EPOC X', status: 'Inactive', nationalId: '3847561028' },
  { id: 'P-1012', name: 'Sami Al-Nasser', dob: '1995-06-15', gender: 'Male', device: 'Emotiv EPOC X', status: 'Active', nationalId: '2938475611' },
];

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

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(0)).current;
  const [chartWidth, setChartWidth] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNationalId, setNewUserNationalId] = useState('');
  const [newUserGender, setNewUserGender] = useState<'Male' | 'Female'>('Male');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Specialist' | 'Patient'>('Patient');
  const [newUserMessage, setNewUserMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [adminUsers, setAdminUsers] = useState(INITIAL_ADMIN_USERS);
  const [adminSettings, setAdminSettings] = useState<AdminSettingsState>(INITIAL_ADMIN_SETTINGS);
  const [specPatients, setSpecPatients] = useState(INITIAL_SPEC_PATIENTS);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientNationalId, setNewPatientNationalId] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female'>('Female');
  const [newPatientMessage, setNewPatientMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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
  };

  const openAddUserForm = () => {
    setShowAddUserForm(true);
    setNewUserMessage(null);
  };

  const resetAddUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserNationalId('');
    setNewUserGender('Male');
    setNewUserRole('Patient');
  };

  const handleAddUser = () => {
    const trimmedName = newUserName.trim();
    const trimmedEmail = newUserEmail.trim();
    const trimmedNationalId = newUserNationalId.trim();
    setNewUserMessage(null);

    if (!trimmedName || !trimmedEmail || !trimmedNationalId) {
      setNewUserMessage({
        type: 'error',
        text: 'Name, email, and national ID are required.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setNewUserMessage({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }

    if (!/^\d{10}$/.test(trimmedNationalId)) {
      setNewUserMessage({ type: 'error', text: 'National ID must be a 10-digit number.' });
      return;
    }

    const emailExists = adminUsers.some(
      (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase()
    );

    if (emailExists) {
      setNewUserMessage({ type: 'error', text: 'Email must be unique.' });
      return;
    }

    const nextIdNumbers = adminUsers
      .map((u) => parseInt(u.id, 10))
      .filter((n) => !Number.isNaN(n));
    const nextId =
      (Math.max(...(nextIdNumbers.length ? nextIdNumbers : [1000])) + 1).toString();

    const newUser = {
      id: nextId,
      name: trimmedName,
      email: trimmedEmail,
      role: newUserRole,
      status: 'active',
      nationalId: trimmedNationalId,
      gender: newUserGender,
    };

    setAdminUsers((prev) => [...prev, newUser]);
    setNewUserMessage({ type: 'success', text: 'User added to the list.' });
    resetAddUserForm();
    setShowAddUserForm(true);
  };

  const handleCancelAddUser = () => {
    setShowAddUserForm(false);
    setNewUserMessage(null);
    resetAddUserForm();
  };

  const resetAddPatientForm = () => {
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

  const handleAddPatient = () => {
    const name = newPatientName.trim();
    const nationalId = newPatientNationalId.trim();
    const dob = newPatientDob.trim();
    setNewPatientMessage(null);

    if (!name || !nationalId || !dob) {
      setNewPatientMessage({ type: 'error', text: 'Name, National ID, and DOB are required.' });
      return;
    }

    if (!/^\d{10}$/.test(nationalId)) {
      setNewPatientMessage({ type: 'error', text: 'National ID must be a 10-digit number.' });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setNewPatientMessage({ type: 'error', text: 'Use DOB format YYYY-MM-DD.' });
      return;
    }

    const nextIdNumber = specPatients
      .map((p) => parseInt(p.id.replace('P-', ''), 10))
      .filter((n) => !Number.isNaN(n));
    const nextId = `P-${(Math.max(...(nextIdNumber.length ? nextIdNumber : [1000])) + 1).toString()}`;

    const newPatient = {
      id: nextId,
      name,
      dob,
      gender: newPatientGender,
      device: 'Emotiv EPOC X',
      status: 'Active',
      nationalId,
      role: 'Patient',
    };

    setSpecPatients((prev) => [...prev, newPatient]);
    setNewPatientMessage({ type: 'success', text: 'Patient added to the list.' });
    resetAddPatientForm();
    setShowAddPatientForm(true);
  };

  const setBooleanSetting = <K extends keyof AdminSettingsState>(
    key: K,
    value: AdminSettingsState[K]
  ) => {
    setAdminSettings((prev) => ({ ...prev, [key]: value }));
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
  const roleOptions: Array<'Admin' | 'Specialist' | 'Patient'> = ['Admin', 'Specialist', 'Patient'];

  const role: UserRole = user?.role ?? 'patient';
  const isAdmin = role === 'admin';
  const isPatient = role === 'patient';
  const roleLabel = isPatient ? 'Patient' : isAdmin ? 'Admin' : 'Clinician';

  const adminStats = [
    {
      key: 'users',
      label: 'Total users',
      value: '142',
      icon: 'people-outline',
      tint: colors.logo.paradiso,
      note: 'All roles',
    },
    {
      key: 'sessions',
      label: 'Active sessions',
      value: '8',
      icon: 'pulse-outline',
      tint: colors.logo.calypso,
      note: 'Live EEG',
    },
    {
      key: 'accuracy',
      label: 'Model accuracy',
      value: '94.5%',
      icon: 'checkmark-circle-outline',
      tint: colors.logo.oceanGreen,
      note: 'Last 24h',
    },
    {
      key: 'alerts',
      label: 'System alerts',
      value: '3',
      icon: 'notifications-outline',
      tint: colors.status.warning,
      note: 'Open items',
    },
  ];

  const modelSummary = [
    {
      key: 'train-acc',
      label: 'Training Accuracy',
      value: '95.2%',
      sub: '+3.1% from last',
      icon: 'trending-up-outline' as const,
    },
    {
      key: 'val-loss',
      label: 'Validation Loss',
      value: '0.048',
      sub: '−0.012 improvement',
      icon: 'pulse-outline' as const,
    },
    {
      key: 'model-version',
      label: 'Model Version',
      value: 'v2.3.1',
      sub: 'CNN-BiLSTM',
      icon: 'hardware-chip-outline' as const,
    },
  ];

  // Specialist mock data
  const specKpis = [
    { key: 'assigned', label: 'Assigned Patients', value: '12', sub: '2 new today' },
    { key: 'sessions', label: 'Sessions Today', value: '5', sub: '3 scheduled' },
    { key: 'accuracy', label: 'Avg Accuracy', value: '93.4%', sub: 'Last 24h' },
  ];

  const specConnection = { label: 'EEG Connection', value: 'Connected', sub: 'EPOC X' };

  const specRecentSessions = [
    { id: 'R-2315', patient: 'Sarah Al-Ahmed', word: 'ماء (Water)', accuracy: '93%', time: '10:32' },
    { id: 'R-2314', patient: 'Omar Al-Mutairi', word: 'ألم (Pain)', accuracy: '89%', time: '10:10' },
    { id: 'R-2313', patient: 'Laila Al-Qahtani', word: 'حمام (Bathroom)', accuracy: '84%', time: '09:48' },
    { id: 'R-2312', patient: 'Fatima Youssef', word: 'طعام (Food)', accuracy: '87%', time: '09:25' },
    { id: 'R-2311', patient: 'Maha Al-Salem', word: 'راحة (Rest)', accuracy: '85%', time: '09:05' },
  ];

  const specAlerts = [
    { id: 'A-102', text: 'Critical: Pain detected (Sarah)', time: '10:06', level: 'high' },
    { id: 'A-101', text: 'Help requested (Omar)', time: '09:32', level: 'med' },
    { id: 'A-099', text: 'EEG signal drop (Room 9)', time: '08:50', level: 'med' },
  ];

  const specReports = [
    { id: 'REP-210', patient: 'Sarah Al-Ahmed', date: '2025-12-16', word: 'ماء', accuracy: '92%' },
    { id: 'REP-209', patient: 'Omar Al-Mutairi', date: '2025-12-15', word: 'ألم', accuracy: '88%' },
    { id: 'REP-208', patient: 'Laila Al-Qahtani', date: '2025-12-14', word: 'حمام', accuracy: '81%' },
    { id: 'REP-207', patient: 'Fatima Youssef', date: '2025-12-13', word: 'راحة', accuracy: '85%' },
    { id: 'REP-206', patient: 'Maha Al-Salem', date: '2025-12-12', word: 'طعام', accuracy: '86%' },
    { id: 'REP-205', patient: 'Yousef Al-Harbi', date: '2025-12-11', word: 'شراب', accuracy: '83%' },
    { id: 'REP-204', patient: 'Noura Al-Jasser', date: '2025-12-10', word: 'حمام', accuracy: '79%' },
    { id: 'REP-203', patient: 'Adel Al-Qahtan', date: '2025-12-09', word: 'ألم', accuracy: '87%' },
    { id: 'REP-202', patient: 'Rania Al-Faisal', date: '2025-12-08', word: 'ماء', accuracy: '90%' },
  ];

  // Recipient mock data
  const recDashboardState: {
    status: string;
    timer: string;
    detectedWord: string;
    detectedWordEn: string;
    confidenceWidth: DimensionValue;
    confidenceLabel: string;
    alert: string;
  } = {
    status: 'Connected',
    timer: '00:12:45',
    detectedWord: 'ماء',
    detectedWordEn: '(Water)',
    confidenceWidth: '92%' as DimensionValue,
    confidenceLabel: '92%',
    alert: 'Critical: Pain detected',
  };

  const recTopStats = [
    {
      key: 'quality',
      label: 'Session quality',
      value: '92%',
      note: 'Stable signals',
      icon: 'pulse-outline' as const,
      tint: colors.logo.paradiso,
    },
    {
      key: 'decoded',
      label: 'Signals decoded',
      value: '124',
      note: 'Today',
      icon: 'analytics-outline' as const,
      tint: colors.logo.calypso,
    },
    {
      key: 'alerts',
      label: 'Alerts today',
      value: '3',
      note: 'Last 24 hours',
      icon: 'notifications-outline' as const,
      tint: colors.status.warning,
    },
  ];

  const recSessions = [
    { id: 'RS-1016', date: '2025-12-20 11:05', word: 'ماء', accuracy: '94%', duration: '16m' },
    { id: 'RS-1015', date: '2025-12-19 10:48', word: 'ألم', accuracy: '89%', duration: '13m' },
    { id: 'RS-1014', date: '2025-12-18 10:12', word: 'راحة', accuracy: '91%', duration: '17m' },
    { id: 'RS-1013', date: '2025-12-17 09:40', word: 'طعام', accuracy: '87%', duration: '12m' },
    { id: 'RS-1012', date: '2025-12-16 10:32', word: 'ماء', accuracy: '93%', duration: '15m' },
    { id: 'RS-1011', date: '2025-12-15 09:58', word: 'ألم', accuracy: '88%', duration: '12m' },
    { id: 'RS-1010', date: '2025-12-14 09:22', word: 'حمام', accuracy: '84%', duration: '18m' },
    { id: 'RS-1009', date: '2025-12-13 08:55', word: 'طعام', accuracy: '87%', duration: '10m' },
    { id: 'RS-1008', date: '2025-12-12 08:30', word: 'راحة', accuracy: '85%', duration: '14m' },
    { id: 'RS-1007', date: '2025-12-11 08:05', word: 'شراب', accuracy: '82%', duration: '11m' },
    { id: 'RS-1006', date: '2025-12-10 07:40', word: 'دواء', accuracy: '86%', duration: '16m' },
    { id: 'RS-1005', date: '2025-12-09 07:18', word: 'مساعدة', accuracy: '80%', duration: '9m' },
    { id: 'RS-1004', date: '2025-12-08 07:02', word: 'سلام', accuracy: '90%', duration: '13m' },
    { id: 'RS-1003', date: '2025-12-07 06:45', word: 'ألم', accuracy: '83%', duration: '12m' },
    { id: 'RS-1002', date: '2025-12-06 06:20', word: 'ماء', accuracy: '92%', duration: '15m' },
    { id: 'RS-1001', date: '2025-12-05 06:05', word: 'راحة', accuracy: '88%', duration: '14m' },
  ];

  const recSettings = {
    name: 'Sarah Al-Ahmed',
    email: 'sarah@email.com',
    phone: '+966-5-5555-5555',
    device: 'Emotiv Epoc X',
    deviceStatus: 'Connected',
  };

  const adminLogs = [
    {
      id: 'S-4832',
      user: 'Sarah Al-Ahmed',
      role: 'Patient',
      event: 'EEG session',
      status: 'completed',
      time: '10:24',
      duration: '15m',
      device: 'EPOC X',
      location: 'Room 12',
      severity: 'low',
    },
    {
      id: 'S-4831',
      user: 'Dr. Rabab Alkhalifa',
      role: 'Specialist',
      event: 'Model switch to CNN-LSTM v1.0',
      status: 'info',
      time: '09:55',
      duration: '—',
      device: 'Web console',
      location: 'Clinic',
      severity: 'low',
    },
    {
      id: 'S-4829',
      user: 'System',
      role: 'Admin',
      event: 'Validation loss spike detected',
      status: 'warning',
      time: '09:20',
      duration: '—',
      device: 'Pipeline',
      location: 'Cloud',
      severity: 'med',
    },
    {
      id: 'S-4828',
      user: 'Omar Al-Mutairi',
      role: 'Specialist',
      event: 'Alert acknowledged',
      status: 'warning',
      time: '09:10',
      duration: '—',
      device: 'Tablet',
      location: 'ICU',
      severity: 'med',
    },
    {
      id: 'S-4820',
      user: 'System',
      role: 'Admin',
      event: 'EEG drop on channel FC5',
      status: 'warning',
      time: '08:50',
      duration: '—',
      device: 'EPOC X',
      location: 'Room 9',
      severity: 'high',
    },
    {
      id: 'S-4815',
      user: 'System',
      role: 'Admin',
      event: 'Nightly training completed',
      status: 'info',
      time: '07:10',
      duration: '42m',
      device: 'Pipeline',
      location: 'Cloud',
      severity: 'low',
    },
    {
      id: 'S-4810',
      user: 'Fatima Youssef',
      role: 'Patient',
      event: 'Session paused by caregiver',
      status: 'warning',
      time: '06:55',
      duration: '—',
      device: 'EPOC X',
      location: 'Ward B',
      severity: 'med',
    },
    {
      id: 'S-4802',
      user: 'System',
      role: 'Admin',
      event: 'Auth token rotated',
      status: 'completed',
      time: '05:30',
      duration: '—',
      device: 'Service',
      location: 'Cloud',
      severity: 'low',
    },
    {
      id: 'S-4799',
      user: 'Yousef Al-Harbi',
      role: 'Specialist',
      event: 'Exported session report',
      status: 'completed',
      time: '04:48',
      duration: '—',
      device: 'Tablet',
      location: 'ICU',
      severity: 'low',
    },
    {
      id: 'S-4791',
      user: 'System',
      role: 'Admin',
      event: 'Signal quality degraded',
      status: 'warning',
      time: '04:05',
      duration: '—',
      device: 'EPOC X',
      location: 'Room 3',
      severity: 'high',
    },
    {
      id: 'S-4780',
      user: 'Dr. Rabab Alkhalifa',
      role: 'Specialist',
      event: 'Calibration scheduled',
      status: 'info',
      time: '03:40',
      duration: '—',
      device: 'Web console',
      location: 'Clinic',
      severity: 'low',
    },
    {
      id: 'S-4775',
      user: 'System',
      role: 'Admin',
      event: 'Model rollback prepared',
      status: 'info',
      time: '03:10',
      duration: '—',
      device: 'Pipeline',
      location: 'Cloud',
      severity: 'med',
    },
  ];

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

  const adminSessionLogs = [
    {
      id: 'S-4832',
      user: 'Sarah Al-Ahmed',
      role: 'Patient',
      event: 'EEG session',
      status: 'completed',
      time: '10:24',
      duration: '15m',
    },
    {
      id: 'S-4831',
      user: 'Dr. Rabab Alkhalifa',
      role: 'Specialist',
      event: 'Model switch to CNN-LSTM v1.0',
      status: 'info',
      time: '09:55',
      duration: '—',
    },
    {
      id: 'S-4828',
      user: 'Omar Al-Mutairi',
      role: 'Specialist',
      event: 'Alert acknowledged',
      status: 'warning',
      time: '09:10',
      duration: '—',
    },
  ];

  const systemHealth = [
    { label: 'API latency', value: '121 ms', status: 'good' as const },
    { label: 'Queue depth', value: '37 msgs', status: 'info' as const },
    { label: 'Uptime', value: '99.96%', status: 'good' as const },
    { label: 'Last alert', value: 'EEG drop (5m ago)', status: 'warning' as const },
  ];

  // Slightly varied mock points to feel more “live”
  const modelAccuracyPoints = [
    { label: 'W1', value: 89.5 },
    { label: 'W2', value: 92.3 },
    { label: 'W3', value: 90.8 },
    { label: 'W4', value: 93.7 },
    { label: 'W5', value: 92.9 },
    { label: 'W6', value: 94.8 },
    { label: 'W7', value: 91.6 },
    { label: 'W8', value: 95.1 },
  ];

  const chartHeight = 260;
  const chartPadding = spacing.lg + 10; // extra to separate Y labels from first tick
  // Clamp to 50-100 domain for stable grid
  const domainMin = 50;
  const domainMax = 100;
  const range = domainMax - domainMin;
  const usableWidth = Math.max(1, chartWidth - chartPadding * 2);
  const usableHeight = chartHeight - chartPadding * 2;

  const chartPoints = modelAccuracyPoints.map((point, idx) => {
    // Add a virtual "W0" slot so W1 starts after the Y-axis padding
    const x =
      chartPadding +
      ((idx + 1) / (modelAccuracyPoints.length + 1)) * usableWidth;
    const clamped = Math.min(domainMax, Math.max(domainMin, point.value));
    const y =
      chartHeight -
      chartPadding -
      ((clamped - domainMin) / range) * usableHeight;
    return { ...point, x, y };
  });

  const renderAdminContent = () => {

    if (activeSidebarItem === 'admin-users') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard, styles.recGlassCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>User Management</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Manage system users and permissions
                </AppText>
              </View>
              <TouchableOpacity style={styles.adminPrimaryButton} onPress={openAddUserForm}>
                <Ionicons name="add" size={18} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>Add user</AppText>
              </TouchableOpacity>
            </View>

            {showAddUserForm && (
              <View style={[styles.adminTableCard, styles.recGlassCard, styles.adminFormCard]}>
                <View style={styles.adminFormHeader}>
                  <View>
                    <AppText style={styles.adminTableTitle}>Add New User</AppText>
                    <AppText style={styles.adminTableSubtitle}>
                      Capture required account details
                    </AppText>
                  </View>
                  <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddUser}>
                    <Ionicons name="close" size={18} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>Cancel</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Name</AppText>
                    <TextInput
                      value={newUserName}
                      onChangeText={setNewUserName}
                      placeholder="User's full name"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>Required input.</AppText>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Email</AppText>
                    <TextInput
                      value={newUserEmail}
                      onChangeText={setNewUserEmail}
                      placeholder="name@email.com"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>Must be valid and unique.</AppText>
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>National ID</AppText>
                    <TextInput
                      value={newUserNationalId}
                      onChangeText={setNewUserNationalId}
                      placeholder="10-digit identifier"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>10-digit required.</AppText>
                  </View>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Gender</AppText>
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
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Role</AppText>
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
                    <AppText style={styles.recFormLabel}>Status</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                      <AppText style={styles.adminStatusText}>Active (default)</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>Auto-set when creating a user.</AppText>
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
                    Required fields: name, email, national ID, gender, role.
                  </AppText>
                  <View style={styles.adminFormActionsRow}>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddUser}>
                      <Ionicons name="close" size={16} color={colors.text.primary} />
                      <AppText style={styles.adminGhostButtonText}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminPrimaryButton} onPress={handleAddUser}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>Create User</AppText>
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
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>ID</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Name</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Email</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>Role</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Status</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Actions</AppText>
            </View>

            {filteredAdminUsers.map((userRow) => (
              <View key={userRow.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>
                  {userRow.id}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                  {userRow.name}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                  {userRow.email}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColMedium]}>
                  {userRow.role}
                </AppText>
                <View style={styles.adminColSmall}>
                  <View
                    style={[
                      styles.adminStatusPill,
                      userRow.status === 'active' ? styles.adminPillSuccess : styles.adminPillMuted,
                    ]}
                  >
                    <AppText style={styles.adminStatusText}>
                      {userRow.status === 'active' ? 'Active' : 'Inactive'}
                    </AppText>
                  </View>
                </View>
                <View style={[styles.adminTableCellActions, styles.adminColSmall]}>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="create-outline" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              </View>
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
                  <AppText style={styles.adminTableTitle}>Data Configuration</AppText>
                  <AppText style={styles.adminTableSubtitle}>
                    Upload EEG datasets and select architecture
                  </AppText>
                </View>
              </View>

              <View style={styles.modelField}>
                <AppText style={styles.modelFieldLabel}>EEG Dataset</AppText>
                <View style={styles.modelFieldControl}>
                  <AppText style={styles.modelFieldValue}>Choose file</AppText>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.text.secondary} />
                </View>
                <AppText style={styles.modelFieldHint}>Upload CSV with EEG channel data</AppText>
              </View>

              <View style={styles.modelField}>
                <AppText style={styles.modelFieldLabel}>Model Architecture</AppText>
                <View style={styles.modelFieldControl}>
                  <AppText style={styles.modelFieldValue}>Hybrid CNN-BiLSTM</AppText>
                  <Ionicons name="chevron-down-outline" size={18} color={colors.text.secondary} />
                </View>
              </View>
            </View>

            <View style={styles.modelHalfCard}>
              <View style={styles.adminTableHeader}>
                <View>
                  <AppText style={styles.adminTableTitle}>Performance Overview</AppText>
                  <AppText style={styles.adminTableSubtitle}>
                    Accuracy vs epochs (mock data)
                  </AppText>
                </View>
              </View>

              <View
                style={styles.adminChartBody}
                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
              >
                {chartWidth > 0 && (
                  <Svg width={chartWidth} height={chartHeight} style={StyleSheet.absoluteFill}>
                    {/* Axes */}
                    <Polyline
                      points={`${chartPadding},${chartHeight - chartPadding} ${chartWidth - chartPadding},${chartHeight - chartPadding}`}
                      stroke="rgba(55,93,152,0.3)"
                      strokeWidth={2}
                    />
                    <Polyline
                      points={`${chartPadding},${chartPadding} ${chartPadding},${chartHeight - chartPadding}`}
                      stroke="rgba(55,93,152,0.3)"
                      strokeWidth={2}
                    />
                    {/* Vertical grid lines */}
                    {chartPoints.map((p, idx) => (
                      <Polyline
                        key={`v-${p.label}-${idx}`}
                        points={`${p.x},${chartPadding} ${p.x},${chartHeight - chartPadding}`}
                        stroke="rgba(55,93,152,0.08)"
                        strokeWidth={1}
                      />
                    ))}
                    {/* Horizontal grid lines */}
                    {[0, 0.5, 1].map((t, idx) => {
                      const y = chartPadding + t * usableHeight;
                      return (
                        <Polyline
                          key={`h-${idx}`}
                          points={`${chartPadding},${y} ${chartWidth - chartPadding},${y}`}
                          stroke="rgba(55,93,152,0.08)"
                          strokeWidth={1}
                        />
                      );
                    })}
                    {/* Line + points */}
                    <Polyline
                      points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      stroke={colors.logo.oceanGreen}
                      strokeWidth={3}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chartPoints.map((p) => (
                      <Circle
                        key={p.label}
                        cx={p.x}
                        cy={p.y}
                        r={6}
                        fill={colors.background.white}
                        stroke={colors.logo.oceanGreen}
                        strokeWidth={3}
                      />
                    ))}
                  </Svg>
                )}
                <View style={[styles.adminChartXAxis, { paddingHorizontal: chartPadding }]}>
                  {chartPoints.map((p) => (
                    <AppText key={p.label} style={styles.adminChartLabel}>
                      {p.label}
                    </AppText>
                  ))}
                </View>
                <View style={styles.adminChartYAxis}>
                  <AppText style={styles.adminChartYAxisLabel}>{domainMax}%</AppText>
                  <AppText style={styles.adminChartYAxisLabel}>{domainMin}%</AppText>
                  <AppText style={styles.adminChartYAxisLabel}> </AppText>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'admin-logs') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>Session Logs</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Expanded details for recent EEG sessions and events
                </AppText>
              </View>
              <TouchableOpacity style={styles.adminGhostButton}>
                <Ionicons name="download-outline" size={18} color={colors.text.primary} />
                <AppText style={styles.adminGhostButtonText}>Export</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>ID</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>User</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>Role</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Event</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Status</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Time</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Duration</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Device</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Location</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Severity</AppText>
            </View>

            {adminLogs.map((log) => (
              <View key={log.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>
                  {log.id}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                  {log.user}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColMedium]}>
                  {log.role}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                  {log.event}
                </AppText>
                <View style={styles.adminColSmall}>
                  <View
                    style={[
                      styles.adminStatusPill,
                      log.status === 'completed' && styles.adminPillSuccess,
                      log.status === 'warning' && styles.adminPillWarning,
                      log.status === 'info' && styles.adminPillInfo,
                    ]}
                  >
                    <AppText style={styles.adminStatusText}>
                      {log.status}
                    </AppText>
                  </View>
                </View>
                <AppText style={[styles.adminTableCell, styles.adminColSmall]}>
                  {log.time}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColSmall]}>
                  {log.duration}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColSmall]}>
                  {log.device}
                </AppText>
                <AppText style={[styles.adminTableCell, styles.adminColSmall]}>
                  {log.location}
                </AppText>
                <View style={styles.adminColSmall}>
                  <View
                    style={[
                      styles.adminStatusPill,
                      log.severity === 'high' && styles.adminPillWarning,
                      log.severity === 'med' && styles.adminPillInfo,
                      log.severity === 'low' && styles.adminPillSuccess,
                    ]}
                  >
                    <AppText style={styles.adminStatusText}>
                      {log.severity}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'admin-settings') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard, styles.recGlassCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>Admin Settings</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Control alerts, security, and backup policies
                </AppText>
              </View>
              <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                <AppText style={styles.adminStatusText}>Applies globally</AppText>
              </View>
            </View>

            <View style={styles.recSettingsForm}>
              <View style={styles.recSettingsRow}>
                <View style={[styles.recFormPanel, styles.adminSettingsPanel]}>
                  <AppText style={styles.recPanelTitle}>Alerts & notifications</AppText>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Email Notifications</AppText>
                      <AppText style={styles.adminSettingHelper}>Enable or disable email alerts</AppText>
                    </View>
                    <Switch
                      value={adminSettings.emailNotifications}
                      onValueChange={(v) => setBooleanSetting('emailNotifications', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>New User Registration</AppText>
                      <AppText style={styles.adminSettingHelper}>Alert on new user signup</AppText>
                    </View>
                    <Switch
                      value={adminSettings.newUserRegistrationAlert}
                      onValueChange={(v) => setBooleanSetting('newUserRegistrationAlert', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>System Alerts</AppText>
                      <AppText style={styles.adminSettingHelper}>Activate critical warnings</AppText>
                    </View>
                    <Switch
                      value={adminSettings.systemAlerts}
                      onValueChange={(v) => setBooleanSetting('systemAlerts', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Low Accuracy Warning</AppText>
                      <AppText style={styles.adminSettingHelper}>Alert on accuracy drop</AppText>
                    </View>
                    <Switch
                      value={adminSettings.lowAccuracyWarning}
                      onValueChange={(v) => setBooleanSetting('lowAccuracyWarning', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>High Error Rate</AppText>
                      <AppText style={styles.adminSettingHelper}>Notify on high error rate</AppText>
                    </View>
                    <Switch
                      value={adminSettings.highErrorRate}
                      onValueChange={(v) => setBooleanSetting('highErrorRate', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Maintenance Mode</AppText>
                      <AppText style={styles.adminSettingHelper}>Schedule maintenance alert</AppText>
                    </View>
                    <Switch
                      value={adminSettings.maintenanceMode}
                      onValueChange={(v) => setBooleanSetting('maintenanceMode', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>
                </View>

                <View style={[styles.recFormPanel, styles.adminSettingsPanel]}>
                  <AppText style={styles.recPanelTitle}>Security & sessions</AppText>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Session Timeout (min)</AppText>
                      <AppText style={styles.adminSettingHelper}>Set logout time</AppText>
                    </View>
                    <TextInput
                      value={adminSettings.sessionTimeoutMinutes}
                      onChangeText={handleNumericSettingChange('sessionTimeoutMinutes')}
                      keyboardType="number-pad"
                      placeholder="30"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.adminSettingInput}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Password Expiry (days)</AppText>
                      <AppText style={styles.adminSettingHelper}>Set renewal period</AppText>
                    </View>
                    <TextInput
                      value={adminSettings.passwordExpiryDays}
                      onChangeText={handleNumericSettingChange('passwordExpiryDays')}
                      keyboardType="number-pad"
                      placeholder="90"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.adminSettingInput}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Two-Factor Authentication</AppText>
                      <AppText style={styles.adminSettingHelper}>Enable 2FA security</AppText>
                    </View>
                    <Switch
                      value={adminSettings.twoFactorAuth}
                      onValueChange={(v) => setBooleanSetting('twoFactorAuth', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.recSettingsRow}>
                <View style={[styles.recFormPanel, styles.adminSettingsPanel]}>
                  <AppText style={styles.recPanelTitle}>Data & backups</AppText>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Data Retention (days)</AppText>
                      <AppText style={styles.adminSettingHelper}>Define data lifespan</AppText>
                    </View>
                    <TextInput
                      value={adminSettings.dataRetentionDays}
                      onChangeText={handleNumericSettingChange('dataRetentionDays')}
                      keyboardType="number-pad"
                      placeholder="365"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.adminSettingInput}
                    />
                  </View>

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Backup Frequency</AppText>
                      <AppText style={styles.adminSettingHelper}>Choose backup cycle</AppText>
                    </View>
                    <View style={styles.adminSelectRow}>
                      {backupFrequencyOptions.map((option) => {
                        const isActive = adminSettings.backupFrequency === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.adminSelectOption,
                              isActive && styles.adminSelectOptionActive,
                            ]}
                            onPress={() => setAdminSettings((prev) => ({ ...prev, backupFrequency: option }))}
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

                  <View style={styles.adminSettingRow}>
                    <View style={styles.adminSettingTextCol}>
                      <AppText style={styles.adminSettingLabel}>Auto Backup</AppText>
                      <AppText style={styles.adminSettingHelper}>Enable auto backups</AppText>
                    </View>
                    <Switch
                      value={adminSettings.autoBackup}
                      onValueChange={(v) => setBooleanSetting('autoBackup', v)}
                      trackColor={{ false: colors.primary[100], true: colors.logo.oceanGreen }}
                      thumbColor={colors.background.white}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
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
          <View style={styles.adminChartCard}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>Model accuracy</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Last 8 weeks • CNN-LSTM
                </AppText>
              </View>
              <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                <AppText style={styles.adminStatusText}>Live</AppText>
              </View>
            </View>

            <View
              style={styles.adminChartBody}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
            >
              {chartWidth > 0 && (
                <Svg width={chartWidth} height={chartHeight} style={StyleSheet.absoluteFill}>
                  {/* Axes */}
                  <Polyline
                    points={`${chartPadding},${chartHeight - chartPadding} ${chartWidth - chartPadding},${chartHeight - chartPadding}`}
                    stroke="rgba(55,93,152,0.3)"
                    strokeWidth={2}
                  />
                  <Polyline
                    points={`${chartPadding},${chartPadding} ${chartPadding},${chartHeight - chartPadding}`}
                    stroke="rgba(55,93,152,0.3)"
                    strokeWidth={2}
                  />
                  {/* Vertical grid lines */}
                  {chartPoints.map((p, idx) => (
                    <Polyline
                      key={`v-${p.label}-${idx}`}
                      points={`${p.x},${chartPadding} ${p.x},${chartHeight - chartPadding}`}
                      stroke="rgba(55,93,152,0.08)"
                      strokeWidth={1}
                    />
                  ))}
                  {/* Horizontal grid lines at 50, 75, 100 */}
                  {[0, 0.5, 1].map((t, idx) => {
                    const y = chartPadding + t * usableHeight;
                    return (
                      <Polyline
                        key={`h-${idx}`}
                        points={`${chartPadding},${y} ${chartWidth - chartPadding},${y}`}
                        stroke="rgba(55,93,152,0.08)"
                        strokeWidth={1}
                      />
                    );
                  })}
                  {/* Line + points */}
                  <Polyline
                    points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    stroke={colors.logo.oceanGreen}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartPoints.map((p) => (
                    <Circle
                      key={p.label}
                      cx={p.x}
                      cy={p.y}
                      r={6}
                      fill={colors.background.white}
                      stroke={colors.logo.oceanGreen}
                      strokeWidth={3}
                    />
                  ))}
                </Svg>
              )}
              <View style={[styles.adminChartXAxis, { paddingHorizontal: chartPadding }]}>
                {chartPoints.map((p) => (
                  <AppText key={p.label} style={styles.adminChartLabel}>
                    {p.label}
                  </AppText>
                ))}
              </View>
              <View style={styles.adminChartYAxis}>
                <AppText style={styles.adminChartYAxisLabel}>{domainMax}%</AppText>
                <AppText style={styles.adminChartYAxisLabel}>{domainMin}%</AppText>
                <AppText style={styles.adminChartYAxisLabel}> </AppText>
              </View>
            </View>
          </View>

          <View style={styles.adminChartSide}>
            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <AppText style={styles.adminCardTitle}>System health</AppText>
                <AppText style={styles.adminCardSubtitle}>Realtime checks</AppText>
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

            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <AppText style={styles.adminCardTitle}>Active model</AppText>
                <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                  <AppText style={styles.adminStatusText}>CNN-LSTM v1.0</AppText>
                </View>
              </View>
              <View style={styles.adminModelRow}>
                <AppText style={styles.adminModelLabel}>Accuracy</AppText>
                <AppText style={styles.adminModelValue}>94.5%</AppText>
              </View>
              <View style={styles.adminModelRow}>
                <AppText style={styles.adminModelLabel}>Active</AppText>
                <AppText style={styles.adminModelValue}>Since 08:00</AppText>
              </View>
              <TouchableOpacity style={styles.adminPrimaryButton}>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>Upload new model</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.adminTableCard}>
          <View style={styles.adminTableHeader}>
            <View>
              <AppText style={styles.adminTableTitle}>Session logs</AppText>
              <AppText style={styles.adminTableSubtitle}>
                Recent EEG sessions and system events
              </AppText>
            </View>
            <TouchableOpacity style={styles.adminGhostButton}>
              <Ionicons name="download-outline" size={18} color={colors.text.primary} />
              <AppText style={styles.adminGhostButtonText}>Export</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.adminTableHeadRow}>
            <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>User</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>Role</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Event</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Status</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Time</AppText>
            <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Duration</AppText>
          </View>

          {adminSessionLogs.map((log) => (
            <View key={log.id} style={styles.adminTableRow}>
              <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                {log.user}
              </AppText>
              <AppText style={[styles.adminTableCell, styles.adminColMedium]}>
                {log.role}
              </AppText>
              <AppText style={[styles.adminTableCell, styles.adminColWide]}>
                {log.event}
              </AppText>
              <View style={styles.adminColSmall}>
                <View
                  style={[
                    styles.adminStatusPill,
                    log.status === 'completed' && styles.adminPillSuccess,
                    log.status === 'warning' && styles.adminPillWarning,
                    log.status === 'info' && styles.adminPillInfo,
                  ]}
                >
                  <AppText style={styles.adminStatusText}>
                    {log.status}
                  </AppText>
                </View>
              </View>
              <AppText style={[styles.adminTableCell, styles.adminColSmall]}>
                {log.time}
              </AppText>
              <AppText style={[styles.adminTableCell, styles.adminColSmall]}>
                {log.duration}
              </AppText>
            </View>
          ))}
        </View>
      </>
    );
  };

  const renderSpecialistContent = () => {
    // Switch by specialist sidebar tab
    if (activeSidebarItem === 'spec-patients') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>Patient Management</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Add, edit, or suspend patient records
                </AppText>
              </View>
              <TouchableOpacity style={styles.adminPrimaryButton} onPress={openAddPatientForm}>
                <Ionicons name="add" size={18} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>Add patient</AppText>
              </TouchableOpacity>
            </View>

            {showAddPatientForm && (
              <View style={[styles.adminTableCard, styles.recGlassCard, styles.adminFormCard]}>
                <View style={styles.adminFormHeader}>
                  <View>
                    <AppText style={styles.adminTableTitle}>Add New Patient</AppText>
                    <AppText style={styles.adminTableSubtitle}>Capture required patient details</AppText>
                  </View>
                  <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddPatient}>
                    <Ionicons name="close" size={18} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>Cancel</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Patient Name</AppText>
                    <TextInput
                      value={newPatientName}
                      onChangeText={setNewPatientName}
                      placeholder="Full name of the patient"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>Required input.</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>National ID</AppText>
                    <TextInput
                      value={newPatientNationalId}
                      onChangeText={setNewPatientNationalId}
                      placeholder="10-digit identifier"
                      placeholderTextColor={colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>Required 10 digits.</AppText>
                  </View>
                </View>

                <View style={styles.adminFormGrid}>
                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Date of Birth</AppText>
                    <TextInput
                      value={newPatientDob}
                      onChangeText={setNewPatientDob}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.text.secondary}
                      style={styles.recFormInput}
                    />
                    <AppText style={styles.recFormHelper}>Required date format.</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Gender</AppText>
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
                    <AppText style={styles.recFormLabel}>Role</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                      <AppText style={styles.adminStatusText}>Patient (auto)</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>Default user role: Patient.</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>EEG Device Type</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                      <AppText style={styles.adminStatusText}>Emotiv EPOC X (auto)</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>Default EEG device.</AppText>
                  </View>

                  <View style={styles.adminFormField}>
                    <AppText style={styles.recFormLabel}>Status</AppText>
                    <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                      <AppText style={styles.adminStatusText}>Active (default)</AppText>
                    </View>
                    <AppText style={styles.recFormHelper}>Auto-set on creation.</AppText>
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
                    Required: name, National ID, DOB, gender. Role/device/status are auto.
                  </AppText>
                  <View style={styles.adminFormActionsRow}>
                    <TouchableOpacity style={styles.adminGhostButton} onPress={handleCancelAddPatient}>
                      <Ionicons name="close" size={16} color={colors.text.primary} />
                      <AppText style={styles.adminGhostButtonText}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adminPrimaryButton} onPress={handleAddPatient}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.text.white} />
                      <AppText style={styles.adminPrimaryButtonText}>Add Patient</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>ID</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Name</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColMedium]}>DOB</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Gender</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Device</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Status</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall]}>Actions</AppText>
            </View>

            {specPatients.map((p) => (
              <View key={p.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{p.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{p.name}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColMedium]}>{p.dob}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColSmall]}>{p.gender}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{p.device}</AppText>
                <View style={styles.adminColSmall}>
                  <View
                    style={[
                      styles.adminStatusPill,
                      p.status === 'Active' && styles.adminPillSuccess,
                      p.status === 'Suspended' && styles.adminPillWarning,
                      p.status === 'Inactive' && styles.adminPillMuted,
                    ]}
                  >
                    <AppText style={styles.adminStatusText}>{p.status}</AppText>
                  </View>
                </View>
                <View style={[styles.adminTableCellActions, styles.adminColSmall]}>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="create-outline" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="pause-circle-outline" size={18} color={colors.status.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              </View>
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
              <AppText style={styles.adminTableTitle}>Session Management</AppText>
              <AppText style={styles.adminTableSubtitle}>
                Start/stop EEG sessions, view live signals, and notes
              </AppText>
            </View>
            <View style={styles.specSessionControls}>
              <TouchableOpacity style={[styles.adminPrimaryButton, styles.specSessionButton]}>
                <Ionicons name="play" size={16} color={colors.text.white} />
                <AppText style={styles.adminPrimaryButtonText}>Start</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminGhostButton, styles.specSessionButton]}>
                <Ionicons name="stop" size={16} color={colors.text.primary} />
                <AppText style={styles.adminGhostButtonText}>Stop</AppText>
              </TouchableOpacity>
            </View>
          </View>

            <View style={styles.specSessionRow}>
              <View style={styles.specLiveCard}>
                <View style={[styles.adminTableHeader, styles.specLiveHeader]}>
                <View>
                  <AppText style={styles.adminTableTitle}>Live EEG</AppText>
                  <AppText style={styles.adminTableSubtitle}>Signal preview (mock)</AppText>
                </View>
                <View style={[styles.adminStatusPill, styles.adminPillInfo]}>
                  <AppText style={styles.adminStatusText}>Connected</AppText>
                </View>
              </View>
                <View style={styles.eegGraph}>
                <EegMiniChart />
              </View>
            </View>

            <View style={styles.specSideCard}>
              <View style={styles.specDetectedCard}>
                <AppText style={styles.specDetectedLabel}>Detected Word</AppText>
                <AppText style={styles.specDetectedWord}>ماء</AppText>
                <AppText style={styles.specDetectedSub}>(Water)</AppText>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: '92%' }]} />
                </View>
                <AppText style={styles.specDetectedSub}>Confidence: 92%</AppText>
              </View>
              <View style={styles.specNotesCard}>
                <AppText style={styles.adminTableTitle}>Specialist Notes</AppText>
                <TextInput
                  placeholder="Enter session observations..."
                  placeholderTextColor={colors.text.secondary}
                  multiline
                  style={styles.specNotesInput}
                />
                <TouchableOpacity style={[styles.adminPrimaryButton, { alignSelf: 'flex-start' }]}>
                  <Ionicons name="save-outline" size={16} color={colors.text.white} />
                  <AppText style={styles.adminPrimaryButtonText}>Save Note</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (activeSidebarItem === 'spec-reports') {
      return (
        <View style={styles.adminFullWidthSection}>
          <View style={[styles.adminTableCard, styles.adminFullWidthCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>Reports</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Session summaries and exports
                </AppText>
              </View>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>Report ID</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportPatientCol]}>Patient</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportDateCol]}>Date</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportWordCol]}>Recognized Word</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportAccCol]}>Accuracy</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportExportCol]}>Export</AppText>
            </View>

            {specReports.map((rep) => (
              <View key={rep.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{rep.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportPatientCol]}>{rep.patient}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportDateCol]}>{rep.date}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportWordCol]}>{rep.word}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.specReportAccCol]}>{rep.accuracy}</AppText>
                <View style={[styles.specReportExportCol, styles.specReportExportActions]}>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="download-outline" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="print-outline" size={18} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Default specialist dashboard
    return (
      <View style={styles.adminFullWidthSection}>
        <View style={styles.adminTableHeader}>
          <View>
            <AppText style={styles.adminTableTitle}>Specialist Dashboard</AppText>
            <AppText style={styles.adminTableSubtitle}>
              Monitor assigned patients, sessions, and alerts
            </AppText>
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
            <AppText style={styles.adminTableTitle}>Recent Sessions</AppText>
            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>ID</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Patient</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Word</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, styles.adminTableHeadRight]}>Accuracy</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColSmall, styles.adminTableHeadRight]}>Time</AppText>
            </View>
            {specRecentSessions.map((s) => (
              <View key={s.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{s.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{s.patient}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{s.word}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.adminColSmall]}>{s.accuracy}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.adminColSmall]}>{s.time}</AppText>
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
              <AppText style={styles.specConnMetaText}>Device: Emotiv EPOC X</AppText>
              <AppText style={styles.specConnMetaText}>Channels: 14 | Battery: 82%</AppText>
              <AppText style={styles.specConnMetaText}>Last sync: 45s ago</AppText>
              <AppText style={styles.specConnMetaText}>Signal quality: Stable</AppText>
            </View>
          </View>
        </View>

        <View style={styles.modelRow}>
          <View style={[styles.modelHalfCard, { width: '100%' }]}>
            <AppText style={styles.adminTableTitle}>Critical Alerts</AppText>
            {specAlerts.map((a) => (
              <View key={a.id} style={styles.specAlertRow}>
                <View
                  style={[
                    styles.adminStatusDot,
                    a.level === 'high' && styles.adminDotWarning,
                    a.level === 'med' && styles.adminDotInfo,
                    a.level === 'low' && styles.adminDotSuccess,
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.adminTableCell}>{a.text}</AppText>
                  <AppText style={styles.adminTableSubtitle}>{a.time}</AppText>
                </View>
              </View>
            ))}
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
                <AppText style={styles.adminTableTitle}>My Sessions</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Past sessions with accuracy and duration
                </AppText>
              </View>
            </View>

            <View style={styles.adminTableHeadRow}>
              <AppText style={[styles.adminTableHeadText, styles.adminColNarrow]}>Session ID</AppText>
              <AppText style={[styles.adminTableHeadText, styles.adminColWide]}>Date</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportWordCol]}>Recognized Word</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportAccCol]}>Accuracy</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportDateCol]}>Duration</AppText>
              <AppText style={[styles.adminTableHeadText, styles.specReportExportCol]}>Export</AppText>
            </View>

            {recSessions.map((s) => (
              <View key={s.id} style={styles.adminTableRow}>
                <AppText style={[styles.adminTableCell, styles.adminColNarrow]}>{s.id}</AppText>
                <AppText style={[styles.adminTableCell, styles.adminColWide]}>{s.date}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportWordCol]}>{s.word}</AppText>
                <AppText style={[styles.adminTableCellRight, styles.specReportAccCol]}>{s.accuracy}</AppText>
                <AppText style={[styles.adminTableCell, styles.specReportDateCol]}>{s.duration}</AppText>
                <View style={[styles.specReportExportCol, styles.specReportExportActions]}>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="download-outline" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.adminIconButton}>
                    <Ionicons name="print-outline" size={18} color={colors.text.secondary} />
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
          <View style={[styles.adminTableCard, styles.adminFullWidthCard]}>
            <View style={styles.adminTableHeader}>
              <View>
                <AppText style={styles.adminTableTitle}>Settings</AppText>
                <AppText style={styles.adminTableSubtitle}>
                  Update personal info and device status
                </AppText>
              </View>
            </View>

            <View style={styles.recSettingsForm}>
              <View style={styles.recSettingsRow}>
                <View style={styles.recFormPanel}>
                  <AppText style={styles.recPanelTitle}>Personal info</AppText>
                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>Full Name</AppText>
                    <TextInput defaultValue={recSettings.name} style={styles.recFormInput} />
                    <AppText style={styles.recFormHelper}>Use your name as on file</AppText>
                  </View>
                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>Email Address</AppText>
                    <TextInput
                      defaultValue={recSettings.email}
                      style={styles.recFormInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <AppText style={styles.recFormHelper}>We’ll send reports here</AppText>
                  </View>
                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>Phone Number</AppText>
                    <TextInput
                      defaultValue={recSettings.phone}
                      style={styles.recFormInput}
                      keyboardType="phone-pad"
                    />
                    <AppText style={styles.recFormHelper}>For urgent alerts</AppText>
                  </View>
                </View>

                <View style={styles.recFormPanel}>
                  <AppText style={styles.recPanelTitle}>Device</AppText>
                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>EEG Device</AppText>
                    <View style={styles.recDeviceCard}>
                      <Ionicons name="pulse-outline" size={18} color={colors.logo.paradiso} />
                      <View>
                        <AppText style={styles.recDeviceTitle}>{recSettings.device}</AppText>
                        <AppText style={styles.recDeviceSub}>Auto-detected</AppText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>Device Status</AppText>
                    <View style={styles.recDeviceStatusRow}>
                      <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                        <AppText style={styles.adminStatusText}>{recSettings.deviceStatus}</AppText>
                      </View>
                      <AppText style={styles.recFormHelper}>Last sync: 45s ago</AppText>
                    </View>
                  </View>
                  <View style={styles.recFormField}>
                    <AppText style={styles.recFormLabel}>Notes</AppText>
                    <AppText style={styles.recFormHelper}>Ensure your headset is powered on and paired.</AppText>
                  </View>
                </View>
              </View>

              <View style={styles.recFormActions}>
                <AppText style={styles.recFormHint}>Changes save locally; backend wiring not enabled.</AppText>
                <TouchableOpacity style={[styles.adminPrimaryButton, styles.recSaveButton]}>
                  <Ionicons name="save-outline" size={16} color={colors.text.white} />
                  <AppText style={styles.adminPrimaryButtonText}>Save Changes</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
                  <AppText style={styles.adminStatValue}>{stat.value}</AppText>
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
                <AppText style={styles.cardTitle}>EEG session activity</AppText>
                <AppText style={styles.cardSubtitle}>
                  Live brain signal trend (mock data)
                </AppText>
              </View>
              <View style={styles.recControlsRow}>
                <View style={styles.specSessionControls}>
                  <TouchableOpacity style={[styles.adminPrimaryButton, styles.specSessionButton]}>
                    <Ionicons name="play" size={16} color={colors.text.white} />
                    <AppText style={styles.adminPrimaryButtonText}>Start</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.adminGhostButton, styles.specSessionButton]}>
                    <Ionicons name="stop" size={16} color={colors.text.primary} />
                    <AppText style={styles.adminGhostButtonText}>Stop</AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.recStatusCol}>
                  <View style={styles.specConnStatusRow}>
                    <View style={[styles.adminStatusPill, styles.adminPillSuccess]}>
                      <AppText style={styles.adminStatusText}>{recDashboardState.status}</AppText>
                    </View>
                    <AppText style={styles.adminTableSubtitle}>Timer: {recDashboardState.timer}</AppText>
                  </View>
                  <AppText style={styles.recAlertText}>Critical: {recDashboardState.alert}</AppText>
                </View>
              </View>
            </View>

            <View style={styles.graphArea}>
              <View style={styles.graphBackground}>
                <EegMiniChart />
              </View>
              <View style={styles.bandRow}>
                <View style={styles.bandItem}>
                  <AppText style={styles.bandLabel}>Delta</AppText>
                  <View style={styles.bandBarTrack}>
                    <View style={[styles.bandBarFill, { width: '35%' }]} />
                  </View>
                </View>
                <View style={styles.bandItem}>
                  <AppText style={styles.bandLabel}>Theta</AppText>
                  <View style={styles.bandBarTrack}>
                    <View style={[styles.bandBarFill, { width: '55%' }]} />
                  </View>
                </View>
                <View style={styles.bandItem}>
                  <AppText style={styles.bandLabel}>Alpha</AppText>
                  <View style={styles.bandBarTrack}>
                    <View style={[styles.bandBarFill, { width: '70%' }]} />
                  </View>
                </View>
                <View style={styles.bandItem}>
                  <AppText style={styles.bandLabel}>Beta</AppText>
                  <View style={styles.bandBarTrack}>
                    <View style={[styles.bandBarFill, { width: '45%' }]} />
                  </View>
                </View>
              </View>
              <View style={styles.graphFooterRow}>
                <AppText style={styles.graphFooterLabel}>Current session</AppText>
                <AppText style={styles.graphFooterValue}>On-going</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom row: calendar, appointments, session history */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomCard}>
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
            <AppText style={styles.bottomCardTitle}>Appointments</AppText>
            <AppText style={styles.bottomCardSubtitle}>
              EEG and clinician visits
            </AppText>
            <View style={styles.appointmentTimeline}>
              <View style={styles.appointmentItem}>
                <View style={styles.appointmentIndicatorCol}>
                  <View style={styles.appointmentDotActive} />
                  <View style={styles.appointmentLine} />
                </View>
                <View style={styles.appointmentContentCol}>
                  <AppText style={styles.appointmentTime}>
                    Today • 16:00
                  </AppText>
                  <AppText style={styles.appointmentTitle}>
                    Session with Dr. Aisha
                  </AppText>
                  <AppText style={styles.appointmentMeta}>
                    Home EEG session
                  </AppText>
                </View>
              </View>

              <View style={styles.appointmentItem}>
                <View style={styles.appointmentIndicatorCol}>
                  <View style={styles.appointmentDot} />
                  <View style={styles.appointmentLine} />
                </View>
                <View style={styles.appointmentContentCol}>
                  <AppText style={styles.appointmentTime}>
                    Wed • 11:00
                  </AppText>
                  <AppText style={styles.appointmentTitle}>
                    Calibration & training
                  </AppText>
                  <AppText style={styles.appointmentMeta}>
                    Clinic visit
                  </AppText>
                </View>
              </View>

              <View style={styles.appointmentItem}>
                <View style={styles.appointmentIndicatorCol}>
                  <View style={styles.appointmentDot} />
                </View>
                <View style={styles.appointmentContentCol}>
                  <AppText style={styles.appointmentTime}>
                    Fri • 09:30
                  </AppText>
                  <AppText style={styles.appointmentTitle}>
                    Follow‑up review
                  </AppText>
                  <AppText style={styles.appointmentMeta}>
                    Summary of last EEG sessions
                  </AppText>
                </View>
              </View>
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
        </View>
      </>
    );
  };
  // Keep sidebar selection aligned to role changes
  useEffect(() => {
    if (isAdmin && !activeSidebarItem.startsWith('admin')) {
      setActiveSidebarItem('admin-dashboard');
    } else if (role === 'specialist' && !activeSidebarItem.startsWith('spec')) {
      setActiveSidebarItem('spec-dashboard');
    } else if (isPatient && !activeSidebarItem.startsWith('rec')) {
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
      label: 'Help',
      icon: 'alert-circle-outline' as const,
      badgeColor: colors.status.error,
      lastUsed: '2 min ago',
      count: 4,
    },
    {
      key: 'pain',
      label: 'Pain',
      icon: 'medkit-outline' as const,
      badgeColor: colors.patient.warning,
      lastUsed: '5 min ago',
      count: 3,
    },
    {
      key: 'hungry',
      label: 'Hungry',
      icon: 'fast-food-outline' as const,
      badgeColor: colors.primary[400],
      lastUsed: '20 min ago',
      count: 2,
    },
    {
      key: 'thirsty',
      label: 'Thirsty',
      icon: 'water-outline' as const,
      badgeColor: colors.logo.paradiso,
      lastUsed: '10 min ago',
      count: 5,
    },
    {
      key: 'bathroom',
      label: 'Bathroom',
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
      onPress={() => navigation.navigate('Landing')}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        onPress={() => setSidebarOpen((prev) => !prev)}
        activeOpacity={0.7}
        style={styles.menuButton}
      >
        <MenuBurgerIcon size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Logo
        variant="icon"
        background="transparent"
        size={isSmallScreen ? 'small' : 'medium'}
        style={styles.headerLogo}
      />
      <View style={styles.headerTextContainer}>
        <AppText style={styles.headerTitle}>Natiqi</AppText>
        <AppText style={styles.headerSlogan}>Mind to Message</AppText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Shared soft gradient + orb particles (Landing/Login/Dashboard) */}
      <AppBackground />

      <AppHeader 
        logo={headerLogo}
        showLogo={false}
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
              ]}
              pointerEvents={sidebarOpen ? 'auto' : 'none'}
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
                    : role === 'patient'
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
            {isPatient ? (
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
    </View>
  );
};

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
    backgroundColor: colors.glass.medium,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 18px 40px rgba(55, 93, 152, 0.18)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }
      : {
          shadowColor: colors.primary[400],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
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
  specAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
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
  specReportPatientCol: {
    flex: 0.9,
  },
  specReportDateCol: {
    flex: 0.9,
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
  adminChartCard: {
    flex: 2,
    minWidth: 320,
    backgroundColor: colors.background.white,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 16px 36px rgba(55,93,152,0.14)' }
      : {
          shadowColor: colors.primary[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.16,
          shadowRadius: 14,
          elevation: 5,
        }),
  },
  adminChartSide: {
    flex: 1,
    minWidth: 260,
    gap: spacing.md,
  },
  adminChartBody: {
    marginTop: spacing.md,
    height: 260,
    borderRadius: 14,
    backgroundColor: colors.background.light,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    position: 'relative',
  },
  adminChartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '0%',
    height: 1,
    backgroundColor: 'rgba(55,93,152,0.08)',
  },
  adminChartPoint: {
    position: 'absolute',
    alignItems: 'center',
  },
  adminChartDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.logo.oceanGreen,
    borderWidth: 2,
    borderColor: colors.background.white,
  },
  adminChartLine: {
    position: 'absolute',
    top: 4,
    left: '50%',
    height: 2,
    backgroundColor: colors.logo.oceanGreen,
    opacity: 0.6,
  },
  adminChartLabel: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  adminChartXAxis: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adminChartYAxis: {
    position: 'absolute',
    top: spacing.sm,
    bottom: spacing.sm,
    left: spacing.xs,
    paddingRight: spacing.xs,
    justifyContent: 'space-between',
  },
  adminChartYAxisLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
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
  adminColSmall: { flex: 0.9 },
  adminColNarrow: { flex: 0.7 },
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

