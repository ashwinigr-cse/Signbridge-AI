"""History Manager Module

Coordinates transcription history logs, query filtering,
deletion workflows, and CSV/TXT export generation.
"""

import io
import csv
from typing import List, Dict, Any, Optional
from backend.app.database.models import HistoryRepository, SentenceRepository


class HistoryManager:
    """Manages history records, searches, and data export."""

    def __init__(
        self,
        history_repo: Optional[HistoryRepository] = None,
        sentence_repo: Optional[SentenceRepository] = None
    ):
        self.history_repo = history_repo or HistoryRepository()
        self.sentence_repo = sentence_repo or SentenceRepository()

    def get_history(self, limit: int = 100, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.history_repo.get_history(limit=limit, search_query=search_query)

    def delete_item(self, item_id: int) -> bool:
        return self.history_repo.delete_history_item(item_id)

    def clear_history(self) -> int:
        return self.history_repo.clear_history()

    def export_csv(self) -> str:
        """Generates CSV export of all recognition events."""
        items = self.history_repo.get_history(limit=1000)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Timestamp", "Gesture", "Confidence (%)", "Hand Count", "Source"])

        for it in items:
            writer.writerow([
                it["id"],
                it["timestamp"],
                it["gesture"],
                f"{float(it['confidence']) * 100:.1f}",
                it["hand_count"],
                it["source"]
            ])

        return output.getvalue()

    def export_txt(self) -> str:
        """Generates human-readable text transcription report."""
        items = self.history_repo.get_history(limit=1000)
        sentences = self.sentence_repo.get_sentences(limit=100)

        lines = [
            "============================================================",
            "SIGNBRIDGE AI — INDIAN SIGN LANGUAGE TRANSCRIPTION REPORT",
            "============================================================",
            "",
            "--- SAVED SENTENCES ---"
        ]

        if not sentences:
            lines.append("No sentences recorded yet.")
        else:
            for s in sentences:
                lines.append(f"[{s['created_at']}] {s['sentence']}")

        lines.extend([
            "",
            "--- INDIVIDUAL RECOGNIZED GESTURES ---"
        ])

        if not items:
            lines.append("No gesture history recorded yet.")
        else:
            for it in items:
                lines.append(f"[{it['timestamp']}] {it['gesture']} (Confidence: {float(it['confidence'])*100:.1f}%)")

        lines.append("\n============================================================")
        return "\n".join(lines)
