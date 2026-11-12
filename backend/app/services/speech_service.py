"""Speech Service Module

Manages text-to-speech configuration, voice selection metadata,
speech rate bounds, and anti-repetition guards.
"""

from typing import Dict, Any, Optional
from backend.app.database.models import SettingsRepository


class SpeechService:
    """Manages audio speech preferences and ensures playback deduplication."""

    def __init__(self, settings_repo: Optional[SettingsRepository] = None):
        self.settings_repo = settings_repo or SettingsRepository()
        self.last_spoken_text: Optional[str] = None
        self.min_speech_interval: float = 1.5

    def get_settings(self) -> Dict[str, Any]:
        """Returns active speech parameters."""
        rate = float(self.settings_repo.get_setting("speech_rate", 1.0))
        pitch = float(self.settings_repo.get_setting("speech_pitch", 1.0))
        voice = self.settings_repo.get_setting("selected_voice", "default")
        enabled = self.settings_repo.get_setting("audio_enabled", "true").lower() == "true"

        return {
            "speech_rate": rate,
            "speech_pitch": pitch,
            "selected_voice": voice,
            "audio_enabled": enabled
        }

    def update_settings(self, rate: Optional[float] = None, pitch: Optional[float] = None, voice: Optional[str] = None, enabled: Optional[bool] = None) -> Dict[str, Any]:
        """Updates and persists user voice preferences."""
        if rate is not None:
            self.settings_repo.set_setting("speech_rate", max(0.5, min(2.0, rate)))
        if pitch is not None:
            self.settings_repo.set_setting("speech_pitch", max(0.5, min(1.5, pitch)))
        if voice is not None:
            self.settings_repo.set_setting("selected_voice", voice)
        if enabled is not None:
            self.settings_repo.set_setting("audio_enabled", str(enabled).lower())

        return self.get_settings()

    def should_speak(self, text: str) -> bool:
        """Prevents rapid repetition of the same spoken utterance."""
        if not text or not text.strip():
            return False
        if text.strip().lower() == (self.last_spoken_text or "").strip().lower():
            return False
        self.last_spoken_text = text.strip()
        return True
