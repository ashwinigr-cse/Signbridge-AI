import {
  PredictionResult,
  DatasetSummary,
  GestureSample,
  ModelInfo,
  EvaluationMetrics,
  HistoryItem,
  SavedSentence,
  AppSettings,
  LandmarkPoint
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<{ status: string; app: string; version: string; model_loaded: boolean; classes: string[] }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to reach backend health endpoint');
    return res.json();
  },

  async predict(landmarks: LandmarkPoint[], handCount: number = 1): Promise<PredictionResult> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landmarks,
        hand_count: handCount,
        hand_type: 'Right',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Inference error');
    }
    return res.json();
  },

  async getDatasetSummary(): Promise<DatasetSummary> {
    const res = await fetch(`${API_BASE}/dataset/summary`);
    if (!res.ok) throw new Error('Failed to fetch dataset summary');
    return res.json();
  },

  async getDatasetSamples(): Promise<GestureSample[]> {
    const res = await fetch(`${API_BASE}/dataset/samples`);
    if (!res.ok) throw new Error('Failed to fetch samples');
    return res.json();
  },

  async recordSample(label: string, landmarks: LandmarkPoint[], handType: string = 'Right', sessionId?: string): Promise<{ id: number; message: string }> {
    const res = await fetch(`${API_BASE}/dataset/sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        hand_type: handType,
        landmarks,
        session_id: sessionId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save sample');
    }
    return res.json();
  },

  async deleteSample(sampleId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/dataset/sample/${sampleId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete sample');
    return res.json();
  },

  async seedDataset(): Promise<{ seeded_count: number; message: string }> {
    const res = await fetch(`${API_BASE}/dataset/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed baseline dataset');
    return res.json();
  },

  async clearDataset(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/dataset/clear`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear dataset');
    return res.json();
  },

  async trainModel(modelType: string = 'random_forest', testSize: number = 0.2): Promise<EvaluationMetrics> {
    const res = await fetch(`${API_BASE}/model/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_type: modelType,
        test_size: testSize,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Model training failed');
    }
    return res.json();
  },

  async getModelInfo(): Promise<ModelInfo> {
    const res = await fetch(`${API_BASE}/model/info`);
    if (!res.ok) throw new Error('Failed to fetch model info');
    return res.json();
  },

  async sentenceAction(action: 'add' | 'remove_last' | 'clear' | 'correct', word?: string, sentence?: string): Promise<{ sentence: string; words: string[] }> {
    const res = await fetch(`${API_BASE}/sentence/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, word, sentence }),
    });
    if (!res.ok) throw new Error('Failed to execute sentence action');
    return res.json();
  },

  async saveSentence(): Promise<{ id: number; sentence: string; words: string[]; timestamp: string }> {
    const res = await fetch(`${API_BASE}/sentence/save`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save sentence');
    }
    return res.json();
  },

  async getSavedSentences(limit: number = 50): Promise<SavedSentence[]> {
    const res = await fetch(`${API_BASE}/sentence/saved?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch saved sentences');
    return res.json();
  },

  async deleteSavedSentence(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/sentence/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete sentence');
    return res.json();
  },

  async getHistory(limit: number = 100, query?: string): Promise<HistoryItem[]> {
    const url = query ? `${API_BASE}/history?limit=${limit}&query=${encodeURIComponent(query)}` : `${API_BASE}/history?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async deleteHistoryItem(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete history item');
    return res.json();
  },

  async clearHistory(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear history');
    return res.json();
  },

  getExportUrl(format: 'txt' | 'csv'): string {
    return `${API_BASE}/history/export?format=${format}`;
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};
