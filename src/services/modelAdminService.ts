import { getApiBase } from '../config/apiBase';

export type CurrentModelInfo = {
  model_id: number | null;
  model_name: string;
  model_version: string;
  training_date: string;
  /** Stored as 0–1 (e.g. 0.952). Null when no model row. */
  model_accuracy: number | null;
  model_status: string;
};

export type AdminModelRow = {
  model_id: number;
  model_name: string;
  model_version: string;
  model_accuracy: number;
  model_status: string;
  training_date: string;
};

export async function fetchCurrentModel(): Promise<CurrentModelInfo> {
  const res = await fetch(`${getApiBase()}/admin/current-model`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load model information');
  const d = data as CurrentModelInfo;
  return {
    ...d,
    model_accuracy: d.model_accuracy != null ? Number(d.model_accuracy) : null,
    model_status: d.model_status || '',
  };
}

export async function fetchAdminModels(): Promise<{ models: AdminModelRow[] }> {
  const res = await fetch(`${getApiBase()}/admin/models`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load models');
  return { models: Array.isArray(data.models) ? data.models : [] };
}

export async function saveCurrentModel(body: {
  model_name: string;
  model_version: string;
  training_date: string;
  performed_by_id: string;
  performed_by_name: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${getApiBase()}/admin/current-model`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save model information');
  return data as { message: string };
}
