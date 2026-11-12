export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface DetectedHand {
  handedness: 'Right' | 'Left';
  landmarks: LandmarkPoint[];
  score: number;
}

export interface PredictionResult {
  gesture: string;
  confidence: number;
  is_recognized: boolean;
  is_new_event?: boolean;
  hand_count: number;
  timestamp: string;
  status_message: string;
  probabilities?: Record<string, number>;
}

export interface GestureSample {
  id: number;
  label: string;
  hand_type: string;
  landmarks: LandmarkPoint[];
  session_id: string;
  created_at: string;
}

export interface DatasetSummary {
  total_samples: number;
  total_classes: number;
  class_distribution: Record<string, number>;
  supported_vocabulary: string[];
  health_status: string;
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  class_names: string[];
  total_samples: number;
  train_samples: number;
  test_samples: number;
  trained_at: string;
  model_type: string;
}

export interface ModelInfo {
  is_loaded: boolean;
  model_type: string | null;
  classes: string[];
  confidence_threshold: number;
  model_path: string | null;
  metrics: EvaluationMetrics | null;
}

export interface HistoryItem {
  id: number;
  gesture: string;
  confidence: number;
  hand_count: number;
  source: string;
  timestamp: string;
}

export interface SavedSentence {
  id: number;
  sentence: string;
  words: string[];
  created_at: string;
  spoken_at: string | null;
}

export interface AppSettings {
  confidence_threshold: number;
  debounce_frames: number;
  speech_rate: number;
  speech_pitch: number;
  selected_voice: string;
  audio_enabled: boolean;
}
