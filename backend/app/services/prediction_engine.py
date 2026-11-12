"""Prediction Engine Module

Orchestrates real-time inference, confidence thresholding,
temporal smoothing, stationary hand debouncing, and history logging.
"""

import time
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
import numpy as np

from backend.app.core.config import config
from backend.app.services.landmark_extractor import LandmarkExtractor
from backend.app.services.gesture_classifier import SklearnGestureClassifier
from backend.app.database.models import HistoryRepository


class PredictionEngine:
    """
    Coordinates feature extraction, classification, confidence thresholding,
    and temporal debouncing to ensure clean, non-repetitive live recognition.
    """

    def __init__(
        self,
        classifier: Optional[SklearnGestureClassifier] = None,
        landmark_extractor: Optional[LandmarkExtractor] = None,
        history_repo: Optional[HistoryRepository] = None,
        confidence_threshold: float = config.confidence_threshold,
        debounce_frames: int = config.debounce_frames
    ):
        self.classifier = classifier or SklearnGestureClassifier()
        self.landmark_extractor = landmark_extractor or LandmarkExtractor()
        self.history_repo = history_repo or HistoryRepository()
        self.confidence_threshold = confidence_threshold
        self.debounce_frames = debounce_frames

        # State tracking for temporal debouncing
        self.last_confirmed_gesture: Optional[str] = None
        self.last_confirmed_time: float = 0.0
        self.consecutive_count: int = 0
        self.current_candidate: Optional[str] = None

    def set_threshold(self, threshold: float) -> None:
        """Dynamically updates confidence threshold."""
        self.confidence_threshold = max(0.1, min(0.99, threshold))

    def process_landmarks(
        self,
        landmarks: List[Dict[str, float]],
        hand_count: int = 1,
        source: str = "webcam"
    ) -> Dict[str, Any]:
        """
        Executes inference for a single frame's hand landmarks.

        Returns:
            Dictionary containing:
            - gesture: Predicted sign name or "Unknown"
            - confidence: 0.0 - 1.0
            - is_recognized: bool
            - is_new_event: bool (True only when debounce condition is satisfied)
            - hand_count: int
            - timestamp: ISO 8601 string
            - status_message: Status description
        """
        now_str = datetime.now().isoformat()

        # Check if hand landmarks are present
        if not landmarks or len(landmarks) < 21:
            self.consecutive_count = 0
            self.current_candidate = None
            return {
                "gesture": "No Hand Detected",
                "confidence": 0.0,
                "is_recognized": False,
                "is_new_event": False,
                "hand_count": 0,
                "timestamp": now_str,
                "status_message": "Place hand clearly in camera field of view."
            }

        if not self.classifier.is_ready():
            return {
                "gesture": "Model Not Loaded",
                "confidence": 0.0,
                "is_recognized": False,
                "is_new_event": False,
                "hand_count": hand_count,
                "timestamp": now_str,
                "status_message": "Please train or load an ISL gesture model in Model Training tab."
            }

        # 1. Feature Extraction
        feature_vec = self.landmark_extractor.extract_features(landmarks)

        # 2. Classifier Prediction
        try:
            predicted_label, confidence, prob_dict = self.classifier.predict(feature_vec)
        except Exception as e:
            return {
                "gesture": "Inference Error",
                "confidence": 0.0,
                "is_recognized": False,
                "is_new_event": False,
                "hand_count": hand_count,
                "timestamp": now_str,
                "status_message": str(e)
            }

        # 3. Confidence Threshold Check
        is_confident = confidence >= self.confidence_threshold

        if not is_confident:
            self.consecutive_count = 0
            return {
                "gesture": "Gesture Not Recognized",
                "confidence": round(confidence, 3),
                "is_recognized": False,
                "is_new_event": False,
                "hand_count": hand_count,
                "timestamp": now_str,
                "status_message": f"Confidence {confidence*100:.1f}% below threshold ({self.confidence_threshold*100:.0f}%).",
                "probabilities": prob_dict
            }

        # 4. Temporal Debounce & Stationary Hand Filtering
        now_time = time.time()
        is_new_event = False

        if predicted_label == self.current_candidate:
            self.consecutive_count += 1
        else:
            self.current_candidate = predicted_label
            self.consecutive_count = 1

        # Check if candidate has been stable for debounce_frames
        if self.consecutive_count >= self.debounce_frames:
            # Check cooldown or gesture change
            time_since_last = now_time - self.last_confirmed_time
            if (predicted_label != self.last_confirmed_gesture) or (time_since_last > config.cooldown_seconds):
                is_new_event = True
                self.last_confirmed_gesture = predicted_label
                self.last_confirmed_time = now_time

                # Persist to database history
                try:
                    self.history_repo.record_prediction(
                        gesture=predicted_label,
                        confidence=confidence,
                        hand_count=hand_count,
                        source=source
                    )
                except Exception:
                    pass

        return {
            "gesture": predicted_label,
            "confidence": round(confidence, 3),
            "is_recognized": True,
            "is_new_event": is_new_event,
            "hand_count": hand_count,
            "timestamp": now_str,
            "status_message": "Gesture recognized with high confidence.",
            "probabilities": prob_dict
        }
