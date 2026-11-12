"""Coordinate Normalization and Spatial Feature Extraction Utilities

Implements translation-invariant and scale-invariant geometric transformations
for MediaPipe 21-joint hand skeletal landmarks.
"""

import math
import numpy as np
from typing import List, Dict, Any, Union


class LandmarkNormalizer:
    """Normalizes hand landmarks relative to the wrist and scales by hand geometry."""

    @staticmethod
    def normalize_landmarks(landmarks: List[Union[Dict[str, float], List[float]]]) -> np.ndarray:
        """
        Translates landmarks so wrist (landmark 0) is at origin (0, 0, 0),
        and scales by the maximum distance from wrist to any joint.

        Args:
            landmarks: 21 landmarks (either list of dicts with 'x','y','z' or list of [x, y, z])

        Returns:
            np.ndarray of shape (63,) containing normalized (x, y, z) for 21 joints.
        """
        if not landmarks or len(landmarks) < 21:
            return np.zeros(63, dtype=np.float32)

        coords = []
        for p in landmarks[:21]:
            if isinstance(p, dict):
                coords.append([float(p.get("x", 0.0)), float(p.get("y", 0.0)), float(p.get("z", 0.0))])
            elif isinstance(p, (list, tuple)):
                z_val = float(p[2]) if len(p) > 2 else 0.0
                coords.append([float(p[0]), float(p[1]), z_val])
            elif hasattr(p, "x") and hasattr(p, "y"):
                z_val = getattr(p, "z", 0.0)
                coords.append([float(p.x), float(p.y), float(z_val)])

        points = np.array(coords, dtype=np.float32)  # Shape (21, 3)

        # Step 1: Translation Invariance (Wrist landmark 0 as origin)
        origin = points[0].copy()
        translated = points - origin

        # Step 2: Scale Invariance (Divide by maximum Euclidean distance from origin)
        distances = np.linalg.norm(translated, axis=1)
        max_dist = np.max(distances)

        if max_dist > 1e-6:
            normalized = translated / max_dist
        else:
            normalized = translated

        # Return flattened (63,)
        return normalized.flatten().astype(np.float32)

    @staticmethod
    def extract_finger_angles(landmarks: List[Union[Dict[str, float], List[float]]]) -> np.ndarray:
        """
        Calculates extension/flexion angles for all 5 fingers.
        Useful auxiliary feature vector for robust sign categorization.
        """
        if not landmarks or len(landmarks) < 21:
            return np.zeros(5, dtype=np.float32)

        # Standard MediaPipe Joint Indices:
        # Thumb: 1, 2, 3, 4
        # Index: 5, 6, 7, 8
        # Middle: 9, 10, 11, 12
        # Ring: 13, 14, 15, 16
        # Pinky: 17, 18, 19, 20
        finger_chains = [
            (0, 2, 4),    # Thumb (Wrist -> MCP -> Tip)
            (0, 5, 8),    # Index
            (0, 9, 12),   # Middle
            (0, 13, 16),  # Ring
            (0, 17, 20)   # Pinky
        ]

        coords = []
        for p in landmarks[:21]:
            if isinstance(p, dict):
                coords.append([float(p.get("x", 0.0)), float(p.get("y", 0.0)), float(p.get("z", 0.0))])
            elif isinstance(p, (list, tuple)):
                z_val = float(p[2]) if len(p) > 2 else 0.0
                coords.append([float(p[0]), float(p[1]), z_val])
            elif hasattr(p, "x") and hasattr(p, "y"):
                coords.append([float(p.x), float(p.y), float(getattr(p, "z", 0.0))])

        pts = np.array(coords, dtype=np.float32)
        angles = []

        for p1_idx, p2_idx, p3_idx in finger_chains:
            v1 = pts[p2_idx] - pts[p1_idx]
            v2 = pts[p3_idx] - pts[p2_idx]
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-7)
            angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
            angles.append(angle)

        return np.array(angles, dtype=np.float32)
