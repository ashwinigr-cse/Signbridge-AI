"""Unit Tests for Gesture Classifier and Model Training"""

import pytest
import numpy as np
from pathlib import Path
import tempfile
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from backend.app.services.gesture_classifier import SklearnGestureClassifier
from backend.app.core.exceptions import ModelNotLoadedException


def test_classifier_uninitialized_raises():
    """Verify inference on uninitialized model raises ModelNotLoadedException."""
    temp_dir = Path(tempfile.mkdtemp())
    classifier = SklearnGestureClassifier(
        model_path=temp_dir / "non_existent.joblib",
        label_encoder_path=temp_dir / "non_existent_le.joblib"
    )
    assert not classifier.is_ready()

    dummy_features = np.zeros(68)
    with pytest.raises(ModelNotLoadedException):
        classifier.predict(dummy_features)


def test_classifier_fit_save_and_predict():
    """Verify fitting, serializing, loading, and predicting with confidence."""
    temp_dir = Path(tempfile.mkdtemp())
    model_path = temp_dir / "test_model.joblib"
    le_path = temp_dir / "test_le.joblib"

    # Synthetic training data: 2 distinct classes
    X_class_0 = np.random.normal(loc=0.0, scale=0.1, size=(20, 68))
    X_class_1 = np.random.normal(loc=1.0, scale=0.1, size=(20, 68))
    X = np.vstack([X_class_0, X_class_1])
    y_raw = ["Namaste"] * 20 + ["Help"] * 20

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    rf = RandomForestClassifier(n_estimators=10, random_state=42)
    rf.fit(X, y)

    classifier = SklearnGestureClassifier(model_path=model_path, label_encoder_path=le_path)
    classifier.save_model(rf, le, model_type="RandomForest")

    assert classifier.is_ready()
    assert "Namaste" in classifier.classes_
    assert "Help" in classifier.classes_

    # Predict sample from class 0
    test_sample_0 = np.random.normal(loc=0.0, scale=0.1, size=68)
    pred_label, conf, probs = classifier.predict(test_sample_0)

    assert pred_label == "Namaste"
    assert conf > 0.70
    assert "Namaste" in probs
    assert "Help" in probs
