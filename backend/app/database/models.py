"""Data Access Object (DAO) Repositories for SignBridge AI Database"""

import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.database.db import db_manager, DatabaseManager
from backend.app.core.exceptions import DatabaseException


class SampleRepository:
    """Repository handling gesture training sample storage and retrieval."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    def add_sample(self, label: str, hand_type: str, landmarks: List[Dict[str, float]], session_id: Optional[str] = None) -> int:
        landmarks_json = json.dumps(landmarks)
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO gesture_samples (label, hand_type, landmarks_json, session_id)
                VALUES (?, ?, ?, ?)
                """,
                (label, hand_type, landmarks_json, session_id or "default_session")
            )
            conn.commit()
            return cursor.lastrowid

    def get_all_samples(self) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM gesture_samples ORDER BY id ASC")
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "label": row["label"],
                    "hand_type": row["hand_type"],
                    "landmarks": json.loads(row["landmarks_json"]),
                    "session_id": row["session_id"],
                    "created_at": row["created_at"]
                }
                for row in rows
            ]

    def get_class_counts(self) -> Dict[str, int]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT label, COUNT(*) as count FROM gesture_samples GROUP BY label")
            return {row["label"]: row["count"] for row in cursor.fetchall()}

    def delete_sample(self, sample_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM gesture_samples WHERE id = ?", (sample_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_samples_by_label(self, label: str) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM gesture_samples WHERE label = ?", (label,))
            conn.commit()
            return cursor.rowcount

    def clear_all_samples(self) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM gesture_samples")
            conn.commit()
            return cursor.rowcount


class HistoryRepository:
    """Repository handling recognized gesture event logging and retrieval."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    def record_prediction(self, gesture: str, confidence: float, hand_count: int, source: str = "webcam") -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO recognition_history (gesture, confidence, hand_count, source)
                VALUES (?, ?, ?, ?)
                """,
                (gesture, confidence, hand_count, source)
            )
            conn.commit()
            return cursor.lastrowid

    def get_history(self, limit: int = 100, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            if search_query:
                cursor.execute(
                    """
                    SELECT * FROM recognition_history
                    WHERE gesture LIKE ?
                    ORDER BY id DESC LIMIT ?
                    """,
                    (f"%{search_query}%", limit)
                )
            else:
                cursor.execute(
                    "SELECT * FROM recognition_history ORDER BY id DESC LIMIT ?",
                    (limit,)
                )
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "gesture": row["gesture"],
                    "confidence": row["confidence"],
                    "hand_count": row["hand_count"],
                    "source": row["source"],
                    "timestamp": row["timestamp"]
                }
                for row in rows
            ]

    def delete_history_item(self, history_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM recognition_history WHERE id = ?", (history_id,))
            conn.commit()
            return cursor.rowcount > 0

    def clear_history(self) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM recognition_history")
            conn.commit()
            return cursor.rowcount


class SentenceRepository:
    """Repository for constructed sentences and spoken transcripts."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    def save_sentence(self, sentence: str, words: List[str], spoken_at: Optional[str] = None) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO saved_sentences (sentence, words_json, spoken_at)
                VALUES (?, ?, ?)
                """,
                (sentence, json.dumps(words), spoken_at)
            )
            conn.commit()
            return cursor.lastrowid

    def get_sentences(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM saved_sentences ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "sentence": row["sentence"],
                    "words": json.loads(row["words_json"]),
                    "created_at": row["created_at"],
                    "spoken_at": row["spoken_at"]
                }
                for row in rows
            ]

    def delete_sentence(self, sentence_id: int) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM saved_sentences WHERE id = ?", (sentence_id,))
            conn.commit()
            return cursor.rowcount > 0

    def clear_sentences(self) -> int:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM saved_sentences")
            conn.commit()
            return cursor.rowcount


class SettingsRepository:
    """Repository for user preferences and application settings."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db

    def get_setting(self, key: str, default: Any = None) -> Any:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: Any) -> None:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value
                """,
                (key, str(value))
            )
            conn.commit()

    def get_all_settings(self) -> Dict[str, str]:
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM app_settings")
            return {row["key"]: row["value"] for row in cursor.fetchall()}
