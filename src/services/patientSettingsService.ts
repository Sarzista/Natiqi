import { getApiBase } from '../config/apiBase';

export type PatientSettings = {
  user_national_id: string;
  notify_hunger: boolean;
  notify_thirst: boolean;
  notify_alarm: boolean;
  notify_bathroom: boolean;
  notify_medicine: boolean;
  min_confidence: number;
  text_size: 'normal' | 'large';
  high_contrast: boolean;
  data_retention_days: number;
  /** Opt-in: allow anonymized recorded session data to be used to improve the service. */
  recorded_data_usage_allowed: boolean;
  preferred_device: string;
  updated_at: string;
};

export async function fetchPatientSettings(
  national_id: string,
  opts?: { signal?: AbortSignal },
): Promise<PatientSettings> {
  const res = await fetch(
    `${getApiBase()}/patient/settings?national_id=${encodeURIComponent(national_id)}`,
    { signal: opts?.signal },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load settings');
  return data as PatientSettings;
}

export async function savePatientSettings(body: {
  national_id: string;
  notify_hunger?: boolean;
  notify_thirst?: boolean;
  notify_alarm?: boolean;
  notify_bathroom?: boolean;
  notify_medicine?: boolean;
  min_confidence?: number;
  text_size?: 'normal' | 'large';
  high_contrast?: boolean;
  data_retention_days?: number;
  recorded_data_usage_allowed?: boolean;
  preferred_device?: string;
}): Promise<PatientSettings> {
  const res = await fetch(`${getApiBase()}/patient/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to save settings');
  return (data?.settings ?? data) as PatientSettings;
}

export async function changePatientPassword(body: {
  national_id: string;
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${getApiBase()}/patient/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to change password');
  return data as { message: string };
}
