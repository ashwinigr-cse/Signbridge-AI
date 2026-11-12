"""WebSocket Endpoint for Low-Latency Real-Time Streaming Prediction"""

import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.services.prediction_engine import PredictionEngine
from backend.app.services.gesture_classifier import SklearnGestureClassifier

logger = logging.getLogger(__name__)
ws_router = APIRouter()

# Prediction engine instance for live socket streams
classifier_instance = SklearnGestureClassifier()
prediction_engine = PredictionEngine(classifier=classifier_instance)


@ws_router.websocket("/ws/predict")
async def websocket_predict_endpoint(websocket: WebSocket):
    """
    Real-time bidirectional WebSocket connection.
    Client continuously streams hand landmarks, server returns immediate classification.
    """
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/predict")

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                payload = json.loads(data_text)
                landmarks = payload.get("landmarks", [])
                hand_count = payload.get("hand_count", 1)

                # Process prediction
                result = prediction_engine.process_landmarks(
                    landmarks=landmarks,
                    hand_count=hand_count,
                    source="websocket"
                )

                await websocket.send_text(json.dumps(result))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON format"}))
            except Exception as e:
                logger.error(f"WebSocket inference error: {e}")
                await websocket.send_text(json.dumps({"error": str(e)}))

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.warning(f"WebSocket connection closed with: {e}")
