"""Sentence Builder Module

Assembles recognized gesture tokens into structured, natural sentences
with punctuation handling, undo/clear operations, and database persistence.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.database.models import SentenceRepository


class SentenceBuilder:
    """Manages active sentence construction, word sequencing, and manual edits."""

    def __init__(self, sentence_repo: Optional[SentenceRepository] = None):
        self.sentence_repo = sentence_repo or SentenceRepository()
        self.words: List[str] = []

    def add_word(self, word: str) -> str:
        """Appends a recognized sign token to the active sentence."""
        clean_word = word.strip()
        if not clean_word:
            return self.get_formatted_sentence()

        # Avoid immediate duplicate consecutive word addition
        if self.words and self.words[-1].lower() == clean_word.lower():
            return self.get_formatted_sentence()

        self.words.append(clean_word)
        return self.get_formatted_sentence()

    def remove_last_word(self) -> str:
        """Removes the most recently appended word."""
        if self.words:
            self.words.pop()
        return self.get_formatted_sentence()

    def clear(self) -> None:
        """Clears all tokens from the active sentence buffer."""
        self.words = []

    def set_sentence(self, sentence_text: str) -> None:
        """Sets the sentence directly (for manual keyboard edits)."""
        words = [w.strip() for w in sentence_text.split() if w.strip()]
        self.words = words

    def get_formatted_sentence(self) -> str:
        """Formats word sequence with capitalization and proper spacing."""
        if not self.words:
            return ""

        # Join tokens
        raw = " ".join(self.words)
        # Capitalize initial character
        formatted = raw[0].upper() + raw[1:] if len(raw) > 1 else raw.upper()

        # Add period if not ending with punctuation
        if formatted and not formatted[-1] in ".!?":
            formatted += "."

        return formatted

    def save_current_sentence(self, spoken_at: Optional[str] = None) -> Dict[str, Any]:
        """Persists the constructed sentence to the SQLite database."""
        sentence = self.get_formatted_sentence()
        if not sentence:
            return {"error": "Sentence is empty."}

        record_id = self.sentence_repo.save_sentence(
            sentence=sentence,
            words=self.words,
            spoken_at=spoken_at or datetime.now().isoformat()
        )

        return {
            "id": record_id,
            "sentence": sentence,
            "words": list(self.words),
            "timestamp": datetime.now().isoformat()
        }

    def get_saved_sentences(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent saved sentences from SQLite."""
        return self.sentence_repo.get_sentences(limit=limit)

    def delete_saved_sentence(self, sentence_id: int) -> bool:
        """Deletes a saved sentence by ID."""
        return self.sentence_repo.delete_sentence(sentence_id)
