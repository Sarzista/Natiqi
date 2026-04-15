import { API_BASE } from '../config/apiBase';

export type EegSessionRow = {
  session_id: number;
  patient_national_id: string;
  specialist_national_id: string;
  model_id: number | null;
  start_time: string;
  end_time: string;
  detected_word: string;
  confidence_level: number | null;
  device: string;
  channels: number;
  session_status: string;
};

export async function fetchSpecialistSessions(params: {
  specialist_id?: string;
  patient_national_id?: string;
  limit?: number;
}): Promise<EegSessionRow[]> {
  const qs = new URLSearchParams();
  if (params.specialist_id) qs.set('specialist_id', params.specialist_id);
  if (params.patient_national_id) qs.set('patient_national_id', params.patient_national_id);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/specialist/sessions?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load sessions');
  return data as EegSessionRow[];
}

export async function fetchAdminSessions(limit = 100): Promise<EegSessionRow[]> {
  const res = await fetch(`${API_BASE}/admin/sessions?limit=${encodeURIComponent(String(limit))}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load sessions');
  return data as EegSessionRow[];
}

export async function createEegSessionFromWindow(body: {
  patient_national_id: string;
  specialist_national_id?: string;
  window: number[][];
  device?: string;
}): Promise<{ message: string; session_id: number; prediction: any }> {
  const res = await fetch(`${API_BASE}/eeg/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to create session');
  return data as { message: string; session_id: number; prediction: any };
}

