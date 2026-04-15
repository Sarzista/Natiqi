import { API_BASE } from '../config/apiBase';

export type ModelArtifactStatus = {
  pkl_exists: boolean;
  pkl_path: string;
  pkl_size_bytes: number;
  pkl_modified_at: string;
  config: any;
  metadata: any;
  read_error?: string;
};

export async function fetchModelArtifactStatus(): Promise<ModelArtifactStatus> {
  const res = await fetch(`${API_BASE}/admin/model-artifact-status`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load model artifact status');
  return data as ModelArtifactStatus;
}

