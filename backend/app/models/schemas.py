"""Pydantic Request & Response Schemas for API Serialization"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float = 0.0


class HandLandmarkData(BaseModel):
    handedness: str = "Right"
    landmarks: List[LandmarkPoint]


class GestureSampleCreate(BaseModel):
    label: str
    hand_type: str = "Right"
    landmarks: List[LandmarkPoint]
    session_id: Optional[str] = None


class GestureSampleResponse(BaseModel):
    id: int
    label: str
    hand_type: str
    sample_count: int
    timestamp: str


class PredictionRequest(BaseModel):
    # Normalized 63-element feature vector or list of 21 landmark points
    landmarks: List[LandmarkPoint]
    hand_type: str = "Right"
    hand_count: int = 1


class PredictionResponse(BaseModel):
    gesture: str
    confidence: float
    is_recognized: bool
    hand_count: int
    timestamp: str
    status_message: str
    probabilities: Optional[Dict[str, float]] = None


class TrainingRequest(BaseModel):
    model_type: str = "random_forest"  # "random_forest", "svm", "mlp"
    test_size: float = 0.2
    random_state: int = 42


class EvaluationMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: List[List[int]]
    class_names: List[str]
    total_samples: int
    train_samples: int
    test_samples: int
    trained_at: str
    model_type: str


class ModelInfoResponse(BaseModel):
    is_loaded: bool
    model_type: Optional[str] = None
    classes: List[str] = []
    confidence_threshold: float
    model_path: Optional[str] = None
    metrics: Optional[EvaluationMetrics] = None


class SentenceActionRequest(BaseModel):
    action: str  # "add", "remove_last", "clear", "correct"
    word: Optional[str] = None
    sentence: Optional[str] = None


class SentenceResponse(BaseModel):
    id: Optional[int] = None
    sentence: str
    words: List[str]
    timestamp: str


class HistoryItem(BaseModel):
    id: int
    gesture: str
    confidence: float
    hand_count: int
    timestamp: str
    source: str = "live"


class DatasetSummary(BaseModel):
    total_samples: int
    total_classes: int
    class_distribution: Dict[str, int]
    supported_vocabulary: List[str]
    health_status: str


class AppSettingsSchema(BaseModel):
    confidence_threshold: float = 0.70
    debounce_frames: int = 8
    speech_rate: float = 1.0
    speech_pitch: float = 1.0
    selected_voice: str = "default"
    audio_enabled: bool = True
