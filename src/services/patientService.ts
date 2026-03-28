/**
 * Mock patient service
 * Later this will be replaced with real API calls
 */
import { Patient } from '../types';

// Mock patient data
const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'Ahmed Al-Saud',
    roomNumber: '101',
    status: 'stable',
    lastUpdate: '2 hours ago',
  },
  {
    id: '2',
    name: 'Fatima Al-Rashid',
    roomNumber: '205',
    status: 'monitoring',
    lastUpdate: '30 minutes ago',
  },
  {
    id: '3',
    name: 'Mohammed Al-Zahrani',
    roomNumber: '312',
    status: 'warning',
    lastUpdate: '1 hour ago',
  },
  {
    id: '4',
    name: 'Sara Al-Mutairi',
    roomNumber: '418',
    status: 'critical',
    lastUpdate: '15 minutes ago',
  },
  {
    id: '5',
    name: 'Khalid Al-Otaibi',
    roomNumber: '502',
    status: 'stable',
    lastUpdate: '3 hours ago',
  },
];

/**
 * Get all patients
 */
export const getPatients = async (): Promise<Patient[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_PATIENTS;
};

/**
 * Get patient by ID
 */
export const getPatientById = async (id: string): Promise<Patient | null> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return MOCK_PATIENTS.find(p => p.id === id) || null;
};


