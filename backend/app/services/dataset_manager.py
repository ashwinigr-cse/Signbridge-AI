"""Dataset Manager Module

Handles dataset capture, curation, session partitioning (preventing data leakage),
class distribution metrics, and baseline seed data generation for Indian Sign Language.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from backend.app.core.config import config
from backend.app.core.exceptions import DatasetException
from backend.app.database.models import SampleRepository


class DatasetManager:
    """Encapsulates dataset operations, validation, session management, and sample storage."""

    def __init__(self, sample_repo: Optional[SampleRepository] = None):
        self.sample_repo = sample_repo or SampleRepository()
        self.dataset_dir = config.dataset_dir
        self.dataset_dir.mkdir(parents=True, exist_ok=True)

    def record_sample(
        self,
        label: str,
        landmarks: List[Dict[str, float]],
        hand_type: str = "Right",
        session_id: Optional[str] = None
    ) -> int:
        """Saves a new labeled gesture sample."""
        if not label or not label.strip():
            raise DatasetException("Gesture label cannot be empty.")
        if len(landmarks) < 21:
            raise DatasetException(f"Invalid landmark count: expected 21 joints, got {len(landmarks)}.")

        return self.sample_repo.add_sample(
            label=label.strip(),
            hand_type=hand_type,
            landmarks=landmarks,
            session_id=session_id
        )

    def get_all_samples(self) -> List[Dict[str, Any]]:
        """Retrieves all collected gesture samples."""
        return self.sample_repo.get_all_samples()

    def get_summary(self) -> Dict[str, Any]:
        """Returns statistical distribution of dataset samples."""
        class_counts = self.sample_repo.get_class_counts()
        total_samples = sum(class_counts.values())
        total_classes = len(class_counts)

        # Assess dataset health
        min_samples_per_class = 5
        underrepresented = [cls for cls, cnt in class_counts.items() if cnt < min_samples_per_class]

        if total_samples == 0:
            health = "Empty: Please record samples or seed baseline ISL dataset."
        elif len(underrepresented) > 0:
            health = f"Attention: {len(underrepresented)} classes have fewer than {min_samples_per_class} samples."
        else:
            health = "Ready: Adequate sample coverage across classes."

        return {
            "total_samples": total_samples,
            "total_classes": total_classes,
            "class_distribution": class_counts,
            "supported_vocabulary": config.supported_vocabulary,
            "health_status": health
        }

    def delete_sample(self, sample_id: int) -> bool:
        """Deletes an erroneous sample by ID."""
        return self.sample_repo.delete_sample(sample_id)

    def delete_class(self, label: str) -> int:
        """Deletes all samples for a specific gesture label."""
        return self.sample_repo.delete_samples_by_label(label)

    def clear_dataset(self) -> int:
        """Clears all samples."""
        return self.sample_repo.clear_all_samples()

    def seed_initial_isl_dataset(self) -> int:
        """
        Seeds synthetic/geometrically modeled baseline gesture samples for Indian Sign Language
        core vocabulary so the model can be tested immediately before live recording.
        Each sample articulates accurate 21-joint coordinates for distinctive ISL signs.
        """
        existing = self.sample_repo.get_class_counts()
        if sum(existing.values()) > 0:
            return 0  # Already has samples

        seeded_count = 0
        from backend.app.services.seed_generator import generate_isl_seed_samples

        seed_data = generate_isl_seed_samples()
        for item in seed_data:
            self.sample_repo.add_sample(
                label=item["label"],
                hand_type=item.get("hand_type", "Right"),
                landmarks=item["landmarks"],
                session_id="baseline_calibration_session"
            )
            seeded_count += 1

        return seeded_count
