"""Custom Domain Exceptions for SignBridge AI

Establishes an OOP exception hierarchy for error handling across
camera, model training, landmark extraction, and database persistence layers.
"""


class SignBridgeException(Exception):
    """Base exception for all domain errors within SignBridge AI."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class CameraException(SignBridgeException):
    """Raised when hardware camera acquisition, streaming, or device indexing fails."""
    def __init__(self, message: str = "Failed to access webcam device"):
        super().__init__(message, code="CAMERA_ERROR")


class HandDetectionException(SignBridgeException):
    """Raised when hand landmark extraction or computer vision pipeline fails."""
    def __init__(self, message: str = "Hand detection pipeline error"):
        super().__init__(message, code="HAND_DETECTION_ERROR")


class ModelNotLoadedException(SignBridgeException):
    """Raised when an inference is requested but no trained classifier model is available."""
    def __init__(self, message: str = "Gesture classification model is not loaded"):
        super().__init__(message, code="MODEL_NOT_LOADED")


class ModelTrainingException(SignBridgeException):
    """Raised when model training fails due to insufficient data or convergence error."""
    def __init__(self, message: str = "Model training could not be completed"):
        super().__init__(message, code="TRAINING_ERROR")


class DatasetException(SignBridgeException):
    """Raised when dataset reading, writing, or validation encounters an error."""
    def __init__(self, message: str = "Dataset operation error"):
        super().__init__(message, code="DATASET_ERROR")


class DatabaseException(SignBridgeException):
    """Raised when SQLite storage, retrieval, or schema migration fails."""
    def __init__(self, message: str = "Database operation failure"):
        super().__init__(message, code="DATABASE_ERROR")
