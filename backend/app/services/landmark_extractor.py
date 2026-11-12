"""Landmark Extractor Module

Transforms raw landmark coordinate dictionaries into normalized,
invariant numerical feature vectors ready for machine learning inference.
"""

from typing import List, Dict, Any, Union
import numpy as np
from backend.app.utils.normalization import LandmarkNormalizer
from backend.app.core.exceptions import HandDetectionException


class LandmarkExtractor:
    """Extracts and normalizes features from hand landmarks."""

    def __init__(self, include_angles: bool = True):
        self.include_angles = include_angles

    def extract_features(self, landmarks: List[Union[Dict[str, float], List[float]]]) -> np.ndarray:
        """
        Processes 21 landmarks into a feature vector.
        
        Returns:
            np.ndarray: Vector of normalized coordinates (63,) + optional finger angles (5,),
                        yielding a 68-dimensional feature vector.
        """
        if not landmarks or len(landmarks) < 21:
            dim = 68 if self.include_angles else 63
            return np.zeros(dim, dtype=np.float32)

        # 1. Normalized 63-element coordinate vector
        normalized_coords = LandmarkNormalizer.normalize_landmarks(landmarks)

        # 2. Finger angle dynamics
        if self.include_angles:
            angles = LandmarkNormalizer.extract_finger_angles(landmarks)
            features = np.concatenate([normalized_coords, angles])
        else:
            features = normalized_coords

        return features.astype(np.float32)

    def extract_batch(self, samples: List[List[Union[Dict[str, float], List[float]]]]) -> np.ndarray:
        """Batch transforms a list of gesture landmark sets into a 2D feature matrix (N, D)."""
        feature_list = [self.extract_features(s) for s in samples]
        return np.array(feature_list, dtype=np.float32)
