import { API_BASE } from '../config/apiBase';

export type CurrentModelInfo = {
  model_id: number | null;
  model_name: string;
  model_version: string;
  training_date: string;
};

export async function fetchCurrentModel(): Promise<CurrentModelInfo> {
  const res = await fetch(`${API_BASE}/admin/current-model`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load model information');
  return data as CurrentModelInfo;
}

export async function saveCurrentModel(body: {
  model_name: string;
  model_version: string;
  training_date: string;
  performed_by_id: string;
  performed_by_name: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/admin/current-model`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save model information');
  return data as { message: string };
}
