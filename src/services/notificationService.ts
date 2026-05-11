import { getApiBase } from '../config/apiBase';

export type NotificationRow = {
  notification_id: number;
  patient_national_id: string;
  detected_word: string;
  confidence: number | null;
  event_time: string; // ISO
  seen: boolean;
  /** Present on `GET /specialist/patient-notifications` items. */
  patient_name?: string;
};

export type SpecialistPatientNotificationRow = NotificationRow & { patient_name?: string };

export async function createNotificationEvent(body: {
  patient_national_id: string;
  detected_word: string;
  confidence: number | null;
  event_time: string; // ISO
}): Promise<{ created: boolean; notification: NotificationRow | null; unseen_count: number }> {
  const res = await fetch(`${getApiBase()}/notifications/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to create notification event');
  return data as { created: boolean; notification: NotificationRow | null; unseen_count: number };
}

export async function fetchNotifications(params: {
  national_id: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: NotificationRow[]; unseen_count: number }> {
  const qs = new URLSearchParams();
  qs.set('national_id', params.national_id);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const res = await fetch(`${getApiBase()}/notifications?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load notifications');
  return data as { items: NotificationRow[]; unseen_count: number };
}

export async function markNotificationSeen(body: {
  national_id: string;
  notification_id: number;
}): Promise<{ message: string; unseen_count: number }> {
  const res = await fetch(`${getApiBase()}/notifications/${encodeURIComponent(String(body.notification_id))}/seen`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ national_id: body.national_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to mark notification seen');
  return data as { message: string; unseen_count: number };
}

export async function markAllNotificationsSeen(body: {
  national_id: string;
}): Promise<{ message: string; unseen_count: number }> {
  const res = await fetch(`${getApiBase()}/notifications/seen-all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ national_id: body.national_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to mark all notifications seen');
  return data as { message: string; unseen_count: number };
}

export async function fetchSpecialistPatientNotifications(params: {
  specialist_id: string;
  limit?: number;
}): Promise<{ items: SpecialistPatientNotificationRow[]; unseen_count: number }> {
  const qs = new URLSearchParams();
  qs.set('specialist_id', params.specialist_id);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const res = await fetch(`${getApiBase()}/specialist/patient-notifications?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load patient notifications');
  return data as { items: SpecialistPatientNotificationRow[]; unseen_count: number };
}

export async function markAllSpecialistPatientNotificationsSeen(body: {
  specialist_id: string;
}): Promise<{ message: string; unseen_count: number }> {
  const res = await fetch(`${getApiBase()}/specialist/patient-notifications/seen-all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialist_id: body.specialist_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to mark all notifications seen');
  return data as { message: string; unseen_count: number };
}
