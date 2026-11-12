"""Hand Detector Service

Implements abstract base class and concrete MediaPipe hand landmark detection.
Extracts 21 3D coordinates per hand with handedness (Left/Right) metadata.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np
import logging

try:
    import mediapipe as mp
    # Initialize mp hands module
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    HAS_MEDIAPIPE = True
except (ImportError, AttributeError) as e:
    HAS_MEDIAPIPE = False

logger = logging.getLogger(__name__)


class BaseHandDetector(ABC):
    """Abstract interface defining hand detection contract."""

    @abstractmethod
    def detect_hands(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Processes an image/frame and returns detected hand entities."""
        pass


class MediaPipeHandDetector(BaseHandDetector):
    """
    Concrete implementation of BaseHandDetector using MediaPipe Hands solution.
    Encapsulates landmark extraction, confidence tuning, and coordinate mapping.
    """

    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 2,
        min_detection_confidence: float = 0.6,
        min_tracking_confidence: float = 0.5
    ):
        self.max_num_hands = max_num_hands
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self.static_image_mode = static_image_mode
        self._hands = None

        if HAS_MEDIAPIPE:
            try:
                self._hands = mp_hands.Hands(
                    static_image_mode=self.static_image_mode,
                    max_num_hands=self.max_num_hands,
                    min_detection_confidence=self.min_detection_confidence,
                    min_tracking_confidence=self.min_tracking_confidence
                )
            except Exception as e:
                logger.warning(f"Could not initialize native MediaPipe Hands C++ engine: {e}")

    def detect_hands(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects hands within an RGB or BGR frame.

        Returns:
            List of hand dicts:
            [
                {
                    "handedness": "Right" | "Left",
                    "landmarks": [{"x": float, "y": float, "z": float}, ... (21 points)],
                    "score": float
                }
            ]
        """
        if frame is None or self._hands is None:
            return []

        # Convert BGR to RGB
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        else:
            rgb_frame = frame

        try:
            results = self._hands.process(rgb_frame)
            detected_hands: List[Dict[str, Any]] = []

            if not results.multi_hand_landmarks:
                return []

            for i, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # Extract handedness label if available
                handedness_label = "Right"
                score = 0.95
                if results.multi_handedness and i < len(results.multi_handedness):
                    handedness_info = results.multi_handedness[i].classification[0]
                    handedness_label = handedness_info.label
                    score = float(handedness_info.score)

                # Extract 21 landmark points
                pts = []
                for lm in hand_landmarks.landmark:
                    pts.append({
                        "x": float(lm.x),
                        "y": float(lm.y),
                        "z": float(lm.z)
                    })

                detected_hands.append({
                    "handedness": handedness_label,
                    "landmarks": pts,
                    "score": score
                })

            return detected_hands

        except Exception as e:
            logger.error(f"Error during hand detection: {e}")
            return []

    def draw_landmarks(self, frame: np.ndarray, detected_hands: List[Dict[str, Any]]) -> np.ndarray:
        """Draws skeletal landmarks on an image frame for debugging or visual display."""
        if frame is None or not detected_hands:
            return frame

        annotated = frame.copy()
        h, w, _ = frame.shape

        for hand in detected_hands:
            pts = hand["landmarks"]
            # Draw joints
            for p in pts:
                cx, cy = int(p["x"] * w), int(p["y"] * h)
                cv2.circle(annotated, (cx, cy), 4, (0, 255, 255), -1)

            # Draw bones connections
            connections = [
                (0, 1), (1, 2), (2, 3), (3, 4),        # Thumb
                (0, 5), (5, 6), (6, 7), (7, 8),        # Index
                (5, 9), (9, 10), (10, 11), (11, 12),   # Middle
                (9, 13), (13, 14), (14, 15), (15, 16), # Ring
                (13, 17), (17, 18), (18, 19), (19, 20),# Pinky
                (0, 17)                                # Palm base
            ]
            for p1, p2 in connections:
                if p1 < len(pts) and p2 < len(pts):
                    pt1 = (int(pts[p1]["x"] * w), int(pts[p1]["y"] * h))
                    pt2 = (int(pts[p2]["x"] * w), int(pts[p2]["y"] * h))
                    cv2.line(annotated, pt1, pt2, (0, 200, 255), 2)

        return annotated

    def close(self):
        if self._hands is not None:
            try:
                self._hands.close()
            except Exception:
                pass
