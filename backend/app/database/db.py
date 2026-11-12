"""SQLite Database Manager for SignBridge AI

Provides thread-safe connections, automatic schema initialization,
and database query abstractions for history, sentences, samples, and user settings.
"""

import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.core.config import config
from backend.app.core.exceptions import DatabaseException


class DatabaseManager:
    """Encapsulates SQLite database connection, schema setup, and transactions."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or config.database_path
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Returns a connection with dictionary row access enabled."""
        try:
            conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.Error as e:
            raise DatabaseException(f"Failed to connect to SQLite at {self.db_path}: {e}")

    def _init_db(self) -> None:
        """Initializes database tables if they do not exist."""
        # Ensure parent directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        queries = [
            """
            CREATE TABLE IF NOT EXISTS gesture_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                hand_type TEXT NOT NULL,
                landmarks_json TEXT NOT NULL,
                session_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS recognition_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gesture TEXT NOT NULL,
                confidence REAL NOT NULL,
                hand_count INTEGER NOT NULL,
                source TEXT DEFAULT 'webcam',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS saved_sentences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sentence TEXT NOT NULL,
                words_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                spoken_at TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        ]

        with self.get_connection() as conn:
            cursor = conn.cursor()
            for query in queries:
                cursor.execute(query)
            conn.commit()


# Singleton database instance
db_manager = DatabaseManager()
