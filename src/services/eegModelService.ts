import { API_BASE } from '../config/apiBase';

export type EegPredictWindowResponse = {
  predicted_id: number;
  predicted_word_ar: string;
  confidence: number;
  probs: number[];
  class_names: string[];
};

export async function predictEegWindow(window14x128: number[][]): Promise<EegPredictWindowResponse> {
  const res = await fetch(`${API_BASE}/ml/predict-window`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ window: window14x128 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Inference request failed');
  return data as EegPredictWindowResponse;
}

