"""Gesture Classifier Service

Implements abstract classifier contract and Scikit-Learn based
gesture recognition models with joblib serialization and confidence scoring.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder
from backend.app.core.config import config
from backend.app.core.exceptions import ModelNotLoadedException

logger = logging.getLogger(__name__)


class BaseGestureClassifier(ABC):
    """Abstract interface defining gesture classification contract."""

    @abstractmethod
    def predict(self, feature_vector: np.ndarray) -> Tuple[str, float, Dict[str, float]]:
        """Predicts the sign gesture from a feature vector."""
        pass

    @abstractmethod
    def is_ready(self) -> bool:
        """Returns True if a model has been trained or loaded into memory."""
        pass


class SklearnGestureClassifier(BaseGestureClassifier):
    """
    Concrete gesture classifier powered by Scikit-Learn estimators
    (Random Forest, Gradient Boosting, or Multi-Layer Perceptron).
    """

    def __init__(self, model_path: Optional[Path] = None, label_encoder_path: Optional[Path] = None):
        self.model_path = model_path or (config.models_dir / "isl_classifier.joblib")
        self.label_encoder_path = label_encoder_path or (config.models_dir / "label_encoder.joblib")
        self.model: Optional[Any] = None
        self.label_encoder: Optional[LabelEncoder] = None
        self.model_type: Optional[str] = None
        self.classes_: List[str] = []

        # Attempt automatic loading on initialization
        self.load_model()

    def is_ready(self) -> bool:
        return self.model is not None and self.label_encoder is not None

    def load_model(self) -> bool:
        """Loads serialized model and label encoder from disk."""
        if not self.model_path.exists() or not self.label_encoder_path.exists():
            logger.info("No pre-existing trained model found on disk. Model training required.")
            return False

        try:
            self.model = joblib.load(self.model_path)
            self.label_encoder = joblib.load(self.label_encoder_path)
            self.classes_ = list(self.label_encoder.classes_)
            self.model_type = type(self.model).__name__
            logger.info(f"Loaded {self.model_type} model with classes: {self.classes_}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model from {self.model_path}: {e}")
            self.model = None
            self.label_encoder = None
            return False

    def save_model(self, model: Any, label_encoder: LabelEncoder, model_type: str = "RandomForest") -> None:
        """Serializes trained model and label encoder to disk."""
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, self.model_path)
        joblib.dump(label_encoder, self.label_encoder_path)

        self.model = model
        self.label_encoder = label_encoder
        self.model_type = model_type
        self.classes_ = list(label_encoder.classes_)
        logger.info(f"Model saved successfully to {self.model_path}")

    def predict(self, feature_vector: np.ndarray) -> Tuple[str, float, Dict[str, float]]:
        """
        Infers gesture from feature vector.

        Returns:
            (predicted_gesture, confidence_score, all_probabilities)
        """
        if not self.is_ready():
            raise ModelNotLoadedException("Model is not loaded. Please train or load a model first.")

        # Ensure 2D shape (1, D)
        if feature_vector.ndim == 1:
            features = feature_vector.reshape(1, -1)
        else:
            features = feature_vector

        # Predict probabilities
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(features)[0]
            max_idx = int(np.argmax(probs))
            confidence = float(probs[max_idx])
            gesture_name = str(self.label_encoder.inverse_transform([max_idx])[0])

            prob_dict = {
                str(cls_name): float(probs[i])
                for i, cls_name in enumerate(self.label_encoder.classes_)
            }
        else:
            # Fallback for models without predict_proba
            pred_idx = int(self.model.predict(features)[0])
            gesture_name = str(self.label_encoder.inverse_transform([pred_idx])[0])
            confidence = 1.0
            prob_dict = {gesture_name: 1.0}

        return gesture_name, confidence, prob_dict
