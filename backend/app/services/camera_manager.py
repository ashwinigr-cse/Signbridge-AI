"""Camera Manager Module

Encapsulates hardware video capture, OpenCV device interfacing,
resolution scaling, FPS calculation, and error resilience for SignBridge AI.
"""

import time
import logging
from typing import Optional, Tuple
import cv2
import numpy as np
from backend.app.core.config import config
from backend.app.core.exceptions import CameraException

logger = logging.getLogger(__name__)


class CameraManager:
    """Encapsulates video stream acquisition, frame rate tracking, and resource cleanup."""

    def __init__(self, camera_index: int = config.camera_index, width: int = config.frame_width, height: int = config.frame_height):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.capture: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self._fps: float = 0.0
        self._frame_count: int = 0
        self._start_time: float = time.time()

    def start(self) -> bool:
        """Initializes the webcam device stream."""
        if self.is_running and self.capture is not None and self.capture.isOpened():
            return True

        try:
            self.capture = cv2.VideoCapture(self.camera_index)
            if not self.capture.isOpened():
                logger.warning(f"Physical camera device {self.camera_index} not available (headless/container mode).")
                self.is_running = False
                return False

            self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.is_running = True
            self._start_time = time.time()
            self._frame_count = 0
            logger.info(f"Camera {self.camera_index} opened successfully ({self.width}x{self.height}).")
            return True
        except Exception as e:
            logger.error(f"Error starting camera: {e}")
            self.is_running = False
            return False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Reads a single frame from the camera stream."""
        if not self.is_running or self.capture is None or not self.capture.isOpened():
            # Generate a test pattern frame if hardware camera is not physically attached
            return False, None

        ret, frame = self.capture.read()
        if not ret or frame is None:
            return False, None

        # Horizontal flip for natural selfie mirror reflection
        frame = cv2.flip(frame, 1)

        self._frame_count += 1
        elapsed = time.time() - self._start_time
        if elapsed > 1.0:
            self._fps = round(self._frame_count / elapsed, 1)
            self._frame_count = 0
            self._start_time = time.time()

        return True, frame

    def get_fps(self) -> float:
        """Returns the measured frames per second."""
        return self._fps

    def stop(self) -> None:
        """Safely releases the hardware camera resource."""
        self.is_running = False
        if self.capture is not None:
            try:
                self.capture.release()
            except Exception as e:
                logger.warning(f"Error releasing camera: {e}")
            finally:
                self.capture = None
        logger.info("Camera device released.")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
