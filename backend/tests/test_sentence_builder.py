"""Unit Tests for Sentence Builder Module"""

import pytest
from backend.app.services.sentence_builder import SentenceBuilder


class MockSentenceRepo:
    def __init__(self):
        self.sentences = []

    def save_sentence(self, sentence, words, spoken_at=None):
        self.sentences.append({"sentence": sentence, "words": words, "spoken_at": spoken_at})
        return len(self.sentences)

    def get_sentences(self, limit=50):
        return self.sentences[:limit]

    def delete_sentence(self, sentence_id):
        return True


def test_sentence_builder_add_and_format():
    """Verify words are added with initial capitalization and terminal punctuation."""
    builder = SentenceBuilder(sentence_repo=MockSentenceRepo())
    builder.add_word("namaste")
    builder.add_word("friend")
    result = builder.get_formatted_sentence()
    assert result == "Namaste friend."


def test_sentence_builder_duplicate_suppression():
    """Verify immediate consecutive duplicates are suppressed."""
    builder = SentenceBuilder(sentence_repo=MockSentenceRepo())
    builder.add_word("Hello")
    builder.add_word("Hello")
    builder.add_word("World")
    assert builder.words == ["Hello", "World"]


def test_sentence_builder_remove_last():
    """Verify undo / remove last word behavior."""
    builder = SentenceBuilder(sentence_repo=MockSentenceRepo())
    builder.add_word("I")
    builder.add_word("need")
    builder.add_word("water")
    builder.remove_last_word()
    assert builder.words == ["I", "need"]
    assert builder.get_formatted_sentence() == "I need."


def test_sentence_builder_clear():
    """Verify clearing the sentence buffer."""
    builder = SentenceBuilder(sentence_repo=MockSentenceRepo())
    builder.add_word("Test")
    builder.clear()
    assert builder.words == []
    assert builder.get_formatted_sentence() == ""


def test_sentence_builder_manual_edit():
    """Verify manual override of text."""
    builder = SentenceBuilder(sentence_repo=MockSentenceRepo())
    builder.set_sentence("Please help me today")
    assert builder.words == ["Please", "help", "me", "today"]
    assert builder.get_formatted_sentence() == "Please help me today."
