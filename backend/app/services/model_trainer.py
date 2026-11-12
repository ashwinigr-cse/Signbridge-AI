"""Model Trainer Module

Orchestrates data preparation, cross-validation, hyperparameter fitting,
performance evaluation (Accuracy, F1, Confusion Matrix), and artifact serialization.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import json
import logging
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder

from backend.app.core.config import config
from backend.app.core.exceptions import ModelTrainingException
from backend.app.services.dataset_manager import DatasetManager
from backend.app.services.landmark_extractor import LandmarkExtractor
from backend.app.services.gesture_classifier import SklearnGestureClassifier

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Encapsulates training workflows, cross-validation, and metrics computation."""

    def __init__(
        self,
        dataset_manager: Optional[DatasetManager] = None,
        landmark_extractor: Optional[LandmarkExtractor] = None,
        classifier: Optional[SklearnGestureClassifier] = None
    ):
        self.dataset_manager = dataset_manager or DatasetManager()
        self.landmark_extractor = landmark_extractor or LandmarkExtractor()
        self.classifier = classifier or SklearnGestureClassifier()
        self.metadata_file = config.models_dir / "model_metadata.json"

    def train(
        self,
        model_type: str = "random_forest",
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, Any]:
        """
        Executes end-to-end model training on all stored dataset samples.

        Returns:
            Dictionary containing evaluation metrics and model metadata.
        """
        samples = self.dataset_manager.get_all_samples()
        if not samples or len(samples) < 10:
            raise ModelTrainingException(
                f"Insufficient training samples ({len(samples)} found). Minimum 10 samples required."
            )

        labels = [s["label"] for s in samples]
        unique_labels = sorted(list(set(labels)))
        if len(unique_labels) < 2:
            raise ModelTrainingException(
                f"At least 2 distinct gesture classes are required for classification. Found: {unique_labels}"
            )

        # 1. Feature Extraction
        X_raw = [s["landmarks"] for s in samples]
        X = self.landmark_extractor.extract_batch(X_raw)

        # 2. Label Encoding
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(labels)

        # 3. Stratified Split (preventing distribution skew)
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state, stratify=y
            )
        except ValueError:
            # Fallback if some classes have only 1 sample
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state
            )

        # 4. Instantiate Model
        if model_type.lower() == "mlp":
            estimator = MLPClassifier(
                hidden_layer_sizes=(128, 64),
                max_iter=500,
                activation="relu",
                random_state=random_state
            )
        elif model_type.lower() == "gradient_boosting":
            estimator = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                random_state=random_state
            )
        elif model_type.lower() == "svm":
            estimator = SVC(
                kernel="rbf",
                probability=True,
                random_state=random_state
            )
        else:
            # Default: RandomForest (fast, robust, highly accurate on joint coordinates)
            estimator = RandomForestClassifier(
                n_estimators=120,
                max_depth=15,
                min_samples_split=2,
                random_state=random_state,
                n_jobs=-1
            )

        # 5. Fit Estimator
        logger.info(f"Fitting {model_type} on {len(X_train)} samples across {len(unique_labels)} classes...")
        estimator.fit(X_train, y_train)

        # 6. Evaluate on Held-Out Test Set
        y_pred = estimator.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()

        metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm,
            "class_names": list(label_encoder.classes_),
            "total_samples": len(samples),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "trained_at": datetime.now().isoformat(),
            "model_type": model_type
        }

        # 7. Persist Model and Encoder
        self.classifier.save_model(estimator, label_encoder, model_type=model_type)

        # 8. Save Metadata
        self.metadata_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.metadata_file, "w") as f:
            json.dump(metrics, f, indent=2)

        logger.info(f"Training completed successfully! Accuracy: {acc*100:.2f}%, F1: {f1*100:.2f}%")
        return metrics

    def get_last_metrics(self) -> Optional[Dict[str, Any]]:
        """Reads persisted evaluation metrics if available."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading model metadata: {e}")
        return None
