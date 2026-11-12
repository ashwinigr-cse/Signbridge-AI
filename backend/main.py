"""SignBridge AI — Backend Main Application Entrypoint

FastAPI server integrating MediaPipe hands, Scikit-Learn ISL gesture recognition,
SQLite persistence, and real-time WebSockets.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import os
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = str(Path(__file__).resolve().parent.parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.core.config import config
from backend.app.core.exceptions import SignBridgeException
from backend.app.api.routes import router as api_router, dataset_mgr, model_trainer, classifier
from backend.app.api.websocket import ws_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("signbridge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(f"Starting {config.app_name} v{config.version}...")

    # Auto-seed baseline dataset and train initial model if needed
    try:
        summary = dataset_mgr.get_summary()
        if summary["total_samples"] == 0:
            logger.info("Initializing baseline Indian Sign Language dataset...")
            seeded = dataset_mgr.seed_initial_isl_dataset()
            logger.info(f"Seeded {seeded} baseline ISL samples.")

            logger.info("Training initial baseline gesture recognition model...")
            model_trainer.train(model_type="random_forest")
            logger.info("Baseline model trained and active!")
        elif not classifier.is_ready():
            logger.info("Model not yet trained for existing dataset. Fitting model...")
            model_trainer.train(model_type="random_forest")
    except Exception as e:
        logger.warning(f"Note during auto-bootstrapping: {e}")

    yield

    logger.info(f"Shutting down {config.app_name}...")


app = FastAPI(
    title=config.app_name,
    version=config.version,
    description="Real-Time Indian Sign Language (ISL) Interpreter API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Custom Exception Handler
@app.exception_handler(SignBridgeException)
async def signbridge_exception_handler(request: Request, exc: SignBridgeException):
    return JSONResponse(
        status_code=400,
        content={"error": exc.message, "code": exc.code}
    )

# Include Routers
app.include_router(api_router)
app.include_router(ws_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=config.host, port=config.port, reload=config.debug)
