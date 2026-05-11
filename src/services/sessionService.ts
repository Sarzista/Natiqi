import { getApiBase } from '../config/apiBase';

export type EegSessionRow = {
  session_id: number;
  patient_national_id: string;
  specialist_national_id: string;
  model_id: number | null;
  start_time: string;
  end_time: string;
  detected_word: string;
  confidence_level: number | null;
  /** Most frequent word in session events (same logic as session report). */
  top_predicted_word?: string;
  /** Mean confidence for predictions matching `top_predicted_word`. */
  top_predicted_word_avg_confidence?: number | null;
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
  const res = await fetch(`${getApiBase()}/specialist/sessions?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load sessions');
  return data as EegSessionRow[];
}

export async function fetchAdminSessions(limit = 100): Promise<EegSessionRow[]> {
  const res = await fetch(`${getApiBase()}/admin/sessions?limit=${encodeURIComponent(String(limit))}`);
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
  const res = await fetch(`${getApiBase()}/eeg/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to create session');
  return data as { message: string; session_id: number; prediction: any };
}

export async function createLiveDemoSession(body: {
  patient_national_id: string;
  detected_word: string;
  confidence: number;
  start_time: string;
  end_time: string;
  device?: string;
  events?: Array<{ event_time: string; detected_word: string; confidence: number }>;
}): Promise<{ message: string; session_id: number }> {
  const res = await fetch(`${getApiBase()}/eeg/live-demo/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to save live demo session');
  return data as { message: string; session_id: number };
}

export type LiveDemoSessionReport = {
  session_id: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  avg_confidence: number | null;
  most_repeated_word: string;
  word_counts: Record<string, number>;
  events: Array<{
    elapsed: string;
    day: string;
    event_time: string;
    detected_word: string;
    confidence: number | null;
  }>;
};

export async function fetchLiveDemoSessionReport(session_id: number): Promise<LiveDemoSessionReport> {
  const res = await fetch(`${getApiBase()}/eeg/live-demo/sessions/${encodeURIComponent(String(session_id))}/report`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load report');
  return data as LiveDemoSessionReport;
}

export function liveDemoSessionReportCsvUrl(session_id: number): string {
  return `${getApiBase()}/eeg/live-demo/sessions/${encodeURIComponent(String(session_id))}/report.csv`;
}

export function liveDemoSessionReportXlsxUrl(session_id: number): string {
  return `${getApiBase()}/eeg/live-demo/sessions/${encodeURIComponent(String(session_id))}/report.xlsx`;
}

