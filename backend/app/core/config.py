"""Application Configuration Module

Encapsulates global configuration, model hyperparameters, dataset storage paths,
and default Indian Sign Language (ISL) vocabulary definitions.
"""

from pathlib import Path
from pydantic import BaseModel, Field
from typing import List


class ApplicationConfig(BaseModel):
    """Central configuration for SignBridge AI application."""

    app_name: str = "SignBridge AI"
    version: str = "1.0.0"
    debug: bool = False

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8888

    # Paths
    base_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent)
    dataset_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "dataset")
    models_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "trained_models")
    database_path: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent.parent / "signbridge.db")

    # Camera settings
    camera_index: int = 0
    frame_width: int = 640
    frame_height: int = 480
    target_fps: int = 30

    # ML & Classification Parameters
    confidence_threshold: float = 0.70  # Minimum confidence for a positive gesture prediction
    debounce_frames: int = 8            # Temporal stationary filter to avoid repeated word triggers
    cooldown_seconds: float = 1.2       # Cooldown before the same word can re-trigger without break
    feature_dimension: int = 63         # 21 landmarks * 3 coordinates (x, y, z) per hand

    # Default supported Indian Sign Language vocabulary
    supported_vocabulary: List[str] = [
        "Namaste",
        "Hello",
        "Thank You",
        "Yes",
        "No",
        "Help",
        "Please",
        "Water",
        "Food",
        "Good",
        "Bad",
        "I Love You",
        "Peace",
        "House",
        "Friend",
        "Doctor"
    ]

    model_config = {"arbitrary_types_allowed": True}


# Singleton instance
config = ApplicationConfig()
