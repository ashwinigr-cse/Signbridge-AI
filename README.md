# SIGNBRIDGE AI — Real-Time Indian Sign Language (ISL) Interpreter

**SignBridge AI** is an AI-powered Indian Sign Language (ISL) interpreter combining computer vision, scale-invariant spatial landmark normalization, machine learning classification, sentence construction, and text-to-speech synthesis.

Developed as a rigorous academic Object-Oriented Programming (OOP) mini-project and portfolio-grade software system, SignBridge AI enables barrier-free communication between hearing-impaired individuals and hearing communities.

---

## 1. Project Objectives

1. **Real-Time Gesture Translation**: Capture video at 30 FPS, extract 21 3D hand joints with MediaPipe Hands, and recognize ISL signs with high accuracy.
2. **True Machine Learning Engine**: No hardcoded coordinates or simulated results; an end-to-end dataset collection, feature extraction, and Scikit-Learn training pipeline.
3. **Sentence Construction**: Assemble recognized sign tokens into natural, grammatically capitalized and punctuated sentences with undo and editing controls.
4. **Text-to-Speech Audio**: Synthesize spoken sentences using the browser's Web Speech API with adjustable rate, pitch, voice preferences, and anti-repetition protection.
5. **Robust OOP Architecture**: Modular Python class architecture adhering to SOLID design principles, clean abstraction layers, and separation of concerns.
6. **SQLite Data Persistence**: Historical recognition events, saved sentences, training samples, and user preferences stored safely across application restarts.

---

## 2. Technology Stack

### Frontend
- **React 19 & TypeScript**: Component-based UI with strict typing and high-performance render cycles.
- **Vite**: Ultra-fast module bundling and hot dev middleware.
- **Tailwind CSS v4**: Modern dark-slate aesthetic with custom typography (`Plus Jakarta Sans` & `JetBrains Mono`).
- **Lucide Icons**: Standardized iconography for scientific clarity.
- **MediaPipe Hands**: In-browser zero-latency skeletal joint extraction and 2D canvas visualization.

### Backend
- **Python 3.10+ & FastAPI**: Asynchronous RESTful API routes and WebSockets.
- **OpenCV**: Computer vision frame handling and camera interfacing.
- **Scikit-Learn**: Machine learning classification estimators (Random Forest, Multi-Layer Perceptron, Gradient Boosting, SVM).
- **NumPy & Pandas**: Matrix manipulation and dataset distribution analysis.
- **Joblib**: Model and label encoder artifact serialization.
- **SQLite3**: Thread-safe relational database with parameterized DAO repositories.
- **Pytest**: 100% passing unit and integration test suite across all modules.

---

## 3. System Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                                 USER / WEBCAM                                     |
|                       Video Stream at 30 FPS (640x480)                            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        STAGE 1: HAND DETECTION & LANDMARKS                        |
|   MediaPipe Hands extracts 21 3D landmarks (x, y, z) per detected hand.           |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                      STAGE 2: SPATIAL NORMALIZATION ENGINE                        |
|   LandmarkNormalizer & LandmarkExtractor:                                         |
|   1. Translation Invariance: P_rel = P_i - P_wrist (wrist joint 0 is origin)      |
|   2. Scale Invariance: P_norm = P_rel / max(||P_rel||)                            |
|   3. Feature Augmentation: 63 normalized coords + 5 finger joint angles (68-D)    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       STAGE 3: MACHINE LEARNING CLASSIFICATION                    |
|   SklearnGestureClassifier (RandomForestClassifier / MLP / GradientBoosting)      |
|   - Confidence Score Calibration (predict_proba)                                  |
|   - Threshold Check: If confidence < 0.70 -> "Gesture Not Recognized"             |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        STAGE 4: PREDICTION & DEBOUNCE FILTER                      |
|   PredictionEngine:                                                               |
|   - Temporal Filter: Requires 8 consecutive stable frames before triggering       |
|   - Anti-Repetition Cooldown: Avoids re-firing while hand remains stationary      |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                   STAGE 5: SENTENCE BUILDER & TEXT-TO-SPEECH                      |
|   SentenceBuilder -> Word Tokenization -> Punctuation -> SQLite Database          |
|   SpeechService -> Web Speech API -> Clear Spoken Acoustic Output                 |
+-----------------------------------------------------------------------------------+
```

---

## 4. Object-Oriented Programming (OOP) Implementation

The backend is structured into specialized classes exhibiting OOP fundamentals:

| Class Name | Core Responsibility | OOP Concept & Design Pattern |
|:---|:---|:---|
| `CameraManager` | Encapsulates camera index, resolution, FPS calculation, and hardware resource cleanup. | RAII / Context Manager (`__enter__`, `__exit__`) |
| `BaseHandDetector` | Abstract base class defining `detect_hands()` interface. | Abstraction |
| `MediaPipeHandDetector` | Concrete implementation connecting to MediaPipe C++ Hands solution. | Inheritance & Polymorphism |
| `LandmarkNormalizer` | Static transformation methods for translation and scale invariance. | Encapsulation & Pure Functions |
| `LandmarkExtractor` | Transforms raw joint coordinates into 68-D feature vectors with finger angles. | Strategy Pattern |
| `BaseGestureClassifier` | Abstract classifier interface with `predict()` and `is_ready()`. | Abstraction |
| `SklearnGestureClassifier` | Concrete Scikit-Learn adapter managing model and label encoder joblib serialization. | Adapter & Serialization Pattern |
| `SampleRepository` | Encapsulates SQL queries for gesture samples. | Repository / DAO Pattern |
| `HistoryRepository` | Encapsulates SQL queries for recognized gesture logs. | Repository / DAO Pattern |
| `SentenceRepository` | Encapsulates SQL queries for saved phrases. | Repository / DAO Pattern |
| `SettingsRepository` | Key-value application settings persistence. | Repository / DAO Pattern |
| `DatasetManager` | Curates samples, checks dataset health, and generates baseline ISL seeds. | Facade Pattern |
| `ModelTrainer` | Orchestrates stratified dataset splitting, model fitting, and evaluation metrics. | Pipeline Pattern |
| `PredictionEngine` | Manages real-time confidence thresholding, stationary hand debouncing, and history logging. | Filter & State Pattern |
| `SentenceBuilder` | Manages token lists, capitalization, punctuation formatting, and undo operations. | Builder Pattern |
| `SpeechService` | Coordinates voice settings, speech rates, and playback deduplication. | Service & Anti-Repetition Guard |
| `ApplicationConfig` | Centralized typed Pydantic configuration. | Singleton Pattern |

---

## 5. Supported Indian Sign Language (ISL) Vocabulary

SignBridge AI comes pre-calibrated with baseline ISL signs and allows users to record new signs anytime:

1. **Namaste**: Traditional Indian greeting mudra with vertical palms joined at chest.
2. **Hello**: Flat open palm facing forward with upright spread fingers.
3. **Thank You**: Flat hand moving forward from chin with fingers together.
4. **Yes**: Closed fist (S-handshape) nodding downwards.
5. **No**: Index and middle fingers tapping against thumb in a pinch.
6. **Help**: Thumbs-up resting vertically on flat horizontal palm.
7. **Please**: Open flat palm with subtle circular chest motion.
8. **Water**: W-handshape with index, middle, ring upright; thumb across pinky.
9. **Food**: Fingertips clustered together towards mouth.
10. **Good**: Classic thumbs-up with 4 fingers curled inward.
11. **Bad**: Inverted fist with thumb pointing downwards.
12. **I Love You**: Thumb, index, and pinky extended; middle and ring curled.
13. **Peace**: Victory V-sign with index and middle extended.

---

## 6. Installation & Execution Guide

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Webcam connected to device

### Quick Start (Full-Stack)
```bash
# 1. Install Node.js dependencies
npm install

# 2. Install Python backend dependencies
python3 -m pip install -r backend/requirements.txt

# 3. Start Full-Stack Dev Server (Runs Node/Vite on Port 3000 and FastAPI on Port 8000)
npm run dev
```

### Running Backend Standalone
```bash
python3 backend/main.py
# Backend starts on http://127.0.0.1:8000
# Interactive Swagger docs available at http://127.0.0.1:8000/docs
```

### Running Automated Test Suite
```bash
python3 -m pytest backend/tests/ -v
# 19 passing tests verifying normalizers, models, APIs, and SQLite repositories
```

---

## 7. Demonstration Procedure

1. Open the application at `http://localhost:3000`.
2. Navigate to **Interpreter** from the top navigation.
3. Click **Start Interpreter** and allow camera permissions in your browser.
4. Articulate any supported ISL gesture (e.g. *Namaste*, *Hello*, *Thank You*, *Good*, *Water*).
5. Watch the 21-joint skeleton render onto the camera feed in real time.
6. Observe the recognized word, confidence score gauge, and status feedback.
7. The recognized words automatically append to the **Sentence Builder**.
8. Click **Speak Sentence** to hear the browser speak your sign phrase aloud!
9. Switch to **Model Training** to inspect the Confusion Matrix and evaluate Accuracy/F1 scores.
10. Switch to **History** to export your live session transcription as CSV or TXT.
