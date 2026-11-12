"""Unit Tests for Landmark Extractor and Coordinate Normalization"""

import pytest
import numpy as np
from backend.app.utils.normalization import LandmarkNormalizer
from backend.app.services.landmark_extractor import LandmarkExtractor


def generate_mock_landmarks(offset_x=0.0, offset_y=0.0, scale=1.0):
    """Generates a synthetic 21-point hand landmark set."""
    pts = []
    for i in range(21):
        pts.append({
            "x": float((0.5 + (i * 0.02)) * scale + offset_x),
            "y": float((0.5 + ((i % 5) * 0.04)) * scale + offset_y),
            "z": float((0.01 * (i % 3)) * scale)
        })
    return pts


def test_landmark_normalization_shape():
    """Verify normalizer outputs 63-element 1D array."""
    landmarks = generate_mock_landmarks()
    normalized = LandmarkNormalizer.normalize_landmarks(landmarks)
    assert isinstance(normalized, np.ndarray)
    assert normalized.shape == (63,)


def test_translation_invariance():
    """Verify landmark normalization is invariant to translation across the frame."""
    lm_original = generate_mock_landmarks(offset_x=0.0, offset_y=0.0)
    lm_shifted = generate_mock_landmarks(offset_x=0.25, offset_y=-0.15)

    norm_original = LandmarkNormalizer.normalize_landmarks(lm_original)
    norm_shifted = LandmarkNormalizer.normalize_landmarks(lm_shifted)

    # Coordinates relative to wrist must be virtually identical
    np.testing.assert_allclose(norm_original, norm_shifted, atol=1e-5)


def test_scale_invariance():
    """Verify landmark normalization is invariant to hand distance (scaling)."""
    lm_standard = generate_mock_landmarks(scale=1.0)
    lm_scaled = generate_mock_landmarks(scale=1.8)

    norm_standard = LandmarkNormalizer.normalize_landmarks(lm_standard)
    norm_scaled = LandmarkNormalizer.normalize_landmarks(lm_scaled)

    np.testing.assert_allclose(norm_standard, norm_scaled, atol=1e-4)


def test_empty_landmarks_handling():
    """Verify handling of missing or incomplete hands."""
    norm_empty = LandmarkNormalizer.normalize_landmarks([])
    assert norm_empty.shape == (63,)
    assert np.all(norm_empty == 0)


def test_feature_extractor_angles():
    """Verify LandmarkExtractor includes 5 finger extension angles when configured."""
    extractor_with_angles = LandmarkExtractor(include_angles=True)
    extractor_without_angles = LandmarkExtractor(include_angles=False)

    landmarks = generate_mock_landmarks()
    features_68 = extractor_with_angles.extract_features(landmarks)
    features_63 = extractor_without_angles.extract_features(landmarks)

    assert features_68.shape == (68,)
    assert features_63.shape == (63,)
