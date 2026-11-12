"""Unit Tests for SQLite Persistence and Repositories"""

import pytest
from pathlib import Path
import tempfile
from backend.app.database.db import DatabaseManager
from backend.app.database.models import SampleRepository, HistoryRepository, SentenceRepository, SettingsRepository


@pytest.fixture
def temp_db():
    temp_dir = Path(tempfile.mkdtemp())
    db_file = temp_dir / "test_signbridge.db"
    manager = DatabaseManager(db_path=db_file)
    return manager


def test_sample_repository_crud(temp_db):
    """Test sample addition, querying, and deletion."""
    repo = SampleRepository(db=temp_db)
    mock_lms = [{"x": 0.5, "y": 0.5, "z": 0.0}] * 21

    sample_id = repo.add_sample(label="Namaste", hand_type="Right", landmarks=mock_lms, session_id="test_session")
    assert sample_id > 0

    counts = repo.get_class_counts()
    assert counts.get("Namaste") == 1

    all_samples = repo.get_all_samples()
    assert len(all_samples) == 1
    assert all_samples[0]["label"] == "Namaste"

    deleted = repo.delete_sample(sample_id)
    assert deleted
    assert repo.get_class_counts().get("Namaste", 0) == 0


def test_history_repository(temp_db):
    """Test recognition history recording and searching."""
    repo = HistoryRepository(db=temp_db)

    repo.record_prediction(gesture="Hello", confidence=0.92, hand_count=1)
    repo.record_prediction(gesture="Water", confidence=0.88, hand_count=1)

    history = repo.get_history(limit=10)
    assert len(history) == 2

    search_res = repo.get_history(search_query="Wat")
    assert len(search_res) == 1
    assert search_res[0]["gesture"] == "Water"


def test_settings_repository(temp_db):
    """Test setting key-value storage and retrieval."""
    repo = SettingsRepository(db=temp_db)
    repo.set_setting("confidence_threshold", "0.75")
    val = repo.get_setting("confidence_threshold")
    assert val == "0.75"
