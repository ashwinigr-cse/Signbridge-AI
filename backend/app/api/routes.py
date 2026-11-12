"""FastAPI REST API Routes for SignBridge AI"""

from fastapi import APIRouter, HTTPException, Query, Response
from typing import List, Dict, Any, Optional

from backend.app.core.config import config
from backend.app.models.schemas import (
    PredictionRequest, PredictionResponse,
    TrainingRequest, EvaluationMetrics, ModelInfoResponse,
    GestureSampleCreate, DatasetSummary,
    SentenceActionRequest, SentenceResponse,
    AppSettingsSchema
)
from backend.app.services.prediction_engine import PredictionEngine
from backend.app.services.dataset_manager import DatasetManager
from backend.app.services.model_trainer import ModelTrainer
from backend.app.services.gesture_classifier import SklearnGestureClassifier
from backend.app.services.sentence_builder import SentenceBuilder
from backend.app.services.history_manager import HistoryManager
from backend.app.services.speech_service import SpeechService
from backend.app.database.models import SettingsRepository

router = APIRouter(prefix="/api")

# Service Singletons
classifier = SklearnGestureClassifier()
dataset_mgr = DatasetManager()
model_trainer = ModelTrainer(dataset_manager=dataset_mgr, classifier=classifier)
prediction_engine = PredictionEngine(classifier=classifier)
sentence_builder = SentenceBuilder()
history_mgr = HistoryManager()
speech_service = SpeechService()
settings_repo = SettingsRepository()


@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": config.app_name,
        "version": config.version,
        "model_loaded": classifier.is_ready(),
        "classes": classifier.classes_
    }


# ==================== PREDICTION ====================

@router.post("/predict", response_model=PredictionResponse)
def predict_gesture(payload: PredictionRequest):
    """Processes hand landmarks and returns gesture prediction with confidence."""
    landmarks_dicts = [p.dict() for p in payload.landmarks]
    result = prediction_engine.process_landmarks(
        landmarks=landmarks_dicts,
        hand_count=payload.hand_count,
        source="api"
    )
    return result


# ==================== DATASET ====================

@router.get("/dataset/summary", response_model=DatasetSummary)
def get_dataset_summary():
    """Returns dataset sample counts, class distributions, and health status."""
    summary = dataset_mgr.get_summary()
    return summary


@router.get("/dataset/samples")
def get_dataset_samples():
    """Returns list of recorded gesture samples."""
    return dataset_mgr.get_all_samples()


@router.post("/dataset/sample")
def add_sample(sample: GestureSampleCreate):
    """Adds a newly captured gesture sample."""
    landmarks_dicts = [p.dict() for p in sample.landmarks]
    sample_id = dataset_mgr.record_sample(
        label=sample.label,
        landmarks=landmarks_dicts,
        hand_type=sample.hand_type,
        session_id=sample.session_id
    )
    return {"id": sample_id, "message": f"Sample for '{sample.label}' saved successfully."}


@router.delete("/dataset/sample/{sample_id}")
def delete_sample(sample_id: int):
    """Deletes a single sample by ID."""
    deleted = dataset_mgr.delete_sample(sample_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Sample not found.")
    return {"message": "Sample deleted successfully."}


@router.post("/dataset/seed")
def seed_dataset():
    """Seeds baseline Indian Sign Language samples for immediate training."""
    count = dataset_mgr.seed_initial_isl_dataset()
    return {"seeded_count": count, "message": f"Seeded {count} baseline ISL samples."}


@router.delete("/dataset/clear")
def clear_dataset():
    """Clears all stored samples."""
    count = dataset_mgr.clear_dataset()
    return {"message": f"Cleared {count} samples."}


# ==================== MODEL TRAINING ====================

@router.post("/model/train")
def train_model(payload: TrainingRequest = TrainingRequest()):
    """Triggers model training on stored samples and returns metrics."""
    try:
        metrics = model_trainer.train(
            model_type=payload.model_type,
            test_size=payload.test_size,
            random_state=payload.random_state
        )
        return metrics
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/model/info", response_model=ModelInfoResponse)
def get_model_info():
    """Returns model loading status, recognized classes, and last metrics."""
    metrics = model_trainer.get_last_metrics()
    return {
        "is_loaded": classifier.is_ready(),
        "model_type": classifier.model_type,
        "classes": classifier.classes_,
        "confidence_threshold": prediction_engine.confidence_threshold,
        "model_path": str(classifier.model_path),
        "metrics": metrics
    }


# ==================== SENTENCE BUILDER ====================

@router.post("/sentence/action", response_model=SentenceResponse)
def perform_sentence_action(payload: SentenceActionRequest):
    """Manipulates the active sentence: add word, remove last, clear, or manual edit."""
    action = payload.action.lower()
    if action == "add" and payload.word:
        sentence_builder.add_word(payload.word)
    elif action == "remove_last":
        sentence_builder.remove_last_word()
    elif action == "clear":
        sentence_builder.clear()
    elif action == "correct" and payload.sentence is not None:
        sentence_builder.set_sentence(payload.sentence)

    return {
        "sentence": sentence_builder.get_formatted_sentence(),
        "words": list(sentence_builder.words),
        "timestamp": ""
    }


@router.post("/sentence/save")
def save_sentence():
    """Saves the current sentence to database history."""
    res = sentence_builder.save_current_sentence()
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@router.get("/sentence/saved")
def get_saved_sentences(limit: int = 50):
    """Retrieves saved sentences."""
    return sentence_builder.get_saved_sentences(limit=limit)


@router.delete("/sentence/{sentence_id}")
def delete_saved_sentence(sentence_id: int):
    """Deletes a saved sentence."""
    deleted = sentence_builder.delete_saved_sentence(sentence_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Sentence not found.")
    return {"message": "Sentence deleted."}


# ==================== HISTORY ====================

@router.get("/history")
def get_history(limit: int = 100, query: Optional[str] = None):
    """Returns recognition log history."""
    return history_mgr.get_history(limit=limit, search_query=query)


@router.delete("/history/{history_id}")
def delete_history_item(history_id: int):
    """Deletes a specific history record."""
    deleted = history_mgr.delete_item(history_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"message": "Item deleted."}


@router.delete("/history")
def clear_all_history():
    """Clears all history records."""
    count = history_mgr.clear_history()
    return {"message": f"Cleared {count} items."}


@router.get("/history/export")
def export_history(format: str = Query("txt", pattern="^(txt|csv)$")):
    """Exports history log as plain text or CSV file download."""
    if format == "csv":
        csv_data = history_mgr.export_csv()
        return Response(content=csv_data, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=signbridge_history.csv"})
    else:
        txt_data = history_mgr.export_txt()
        return Response(content=txt_data, media_type="text/plain", headers={"Content-Disposition": "attachment; filename=signbridge_history.txt"})


# ==================== SETTINGS ====================

@router.get("/settings", response_model=AppSettingsSchema)
def get_settings():
    """Returns all application user settings."""
    speech = speech_service.get_settings()
    return {
        "confidence_threshold": prediction_engine.confidence_threshold,
        "debounce_frames": prediction_engine.debounce_frames,
        "speech_rate": speech["speech_rate"],
        "speech_pitch": speech["speech_pitch"],
        "selected_voice": speech["selected_voice"],
        "audio_enabled": speech["audio_enabled"]
    }


@router.post("/settings", response_model=AppSettingsSchema)
def update_settings(payload: AppSettingsSchema):
    """Updates user preferences and recognition thresholds."""
    prediction_engine.set_threshold(payload.confidence_threshold)
    prediction_engine.debounce_frames = payload.debounce_frames
    speech_service.update_settings(
        rate=payload.speech_rate,
        pitch=payload.speech_pitch,
        voice=payload.selected_voice,
        enabled=payload.audio_enabled
    )
    return get_settings()
