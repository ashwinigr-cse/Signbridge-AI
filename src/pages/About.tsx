import React from 'react';
import {
  Code2,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  BookOpen,
  Workflow,
  Sparkles,
  GitBranch,
  Terminal,
  Activity,
  Award
} from 'lucide-react';

export const About: React.FC = () => {
  const oopClasses = [
    {
      name: 'CameraManager',
      responsibility: 'Encapsulates hardware video stream capture, frame rate benchmarking, and graceful hardware recovery.',
      pattern: 'Resource Acquisition Is Initialization (RAII) & Context Manager'
    },
    {
      name: 'BaseHandDetector / MediaPipeHandDetector',
      responsibility: 'Abstract Base Class defining detection contracts with concrete MediaPipe Hands C++ solutions.',
      pattern: 'Abstraction & Polymorphism'
    },
    {
      name: 'LandmarkNormalizer & LandmarkExtractor',
      responsibility: 'Translates wrist (joint 0) to origin and scales by maximum hand span for invariant spatial representation.',
      pattern: 'Stateless Geometric Pipeline & Strategy'
    },
    {
      name: 'BaseGestureClassifier / SklearnGestureClassifier',
      responsibility: 'Abstract classifier interface encapsulating Scikit-Learn estimators, joblib serialization, and probability distributions.',
      pattern: 'Polymorphic Model Adapter'
    },
    {
      name: 'DatasetManager & SampleRepository',
      responsibility: 'Manages sample ingestion, recording sessions (preventing data leakage), and class distribution analytics.',
      pattern: 'Repository Pattern & Data Access Object (DAO)'
    },
    {
      name: 'ModelTrainer',
      responsibility: 'Orchestrates feature matrix generation, stratified train/test partitioning, metric computation, and model serialization.',
      pattern: 'Facade & Pipeline Pattern'
    },
    {
      name: 'PredictionEngine',
      responsibility: 'Coordinates real-time inference smoothing, confidence threshold enforcement, and stationary hand temporal debouncing.',
      pattern: 'Stateful Pipeline & Filter'
    },
    {
      name: 'SentenceBuilder & SentenceRepository',
      responsibility: 'Manages token sequencing, duplicate suppression, grammar capitalization, punctuation, and SQLite persistence.',
      pattern: 'Builder & Command Pattern'
    },
    {
      name: 'SpeechService',
      responsibility: 'Encapsulates browser Web Speech API interactions, rate/pitch adjustments, and audio deduplication guards.',
      pattern: 'Singleton Service & Anti-Repetition Guard'
    },
    {
      name: 'HistoryManager & ApplicationConfig',
      responsibility: 'Provides search queries, CSV/TXT export generation, and centralized Pydantic application configuration.',
      pattern: 'Configuration Singleton & Exporter'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-12">
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <span>ACADEMIC OOP MINI-PROJECT</span>
          <span aria-hidden="true">·</span>
          <span>SYSTEM SPECIFICATION</span>
          <span aria-hidden="true">·</span>
          <span>PORTFOLIO GRADE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          SignBridge AI System Architecture
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          SignBridge AI was designed as a production-grade Indian Sign Language (ISL) recognition system combining computer vision, spatial geometry normalization, machine learning classification, and clean object-oriented software architecture.
        </p>
      </div>

      {/* Visual Showcase Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
          <img
            src="/src/assets/images/isl_interpreter_booth_1794475261786.jpg"
            alt="Sign language interpretation research lab"
            className="w-full h-auto object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-bold text-white">Accessibility Mission</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Over 18 million individuals in India communicate via Indian Sign Language (ISL). Standard speech recognition models exclude signers entirely. SignBridge AI provides an accessible bridge by translating visual hand articulation into text and spoken audio.
          </p>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Real Machine Learning Pipeline</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Zero mock predictions: every inference passes through 21 normalized 3D joint landmarks evaluated against real Scikit-Learn estimators.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive System Flow Diagram */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Workflow className="w-5 h-5 text-cyan-400" />
          <span>Real-Time Data Flow Pipeline</span>
        </h2>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 block">STAGE 1</span>
              <p className="text-xs font-bold text-white">Webcam Frames</p>
              <p className="text-[11px] text-slate-400">30 FPS Video Stream via getUserMedia / OpenCV</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 block">STAGE 2</span>
              <p className="text-xs font-bold text-white">MediaPipe Hands</p>
              <p className="text-[11px] text-slate-400">21 3D Joint Landmarks Extracted per Hand</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 block">STAGE 3</span>
              <p className="text-xs font-bold text-white">Spatial Normalizer</p>
              <p className="text-[11px] text-slate-400">Wrist Origin Alignment + Scale Invariance</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 block">STAGE 4</span>
              <p className="text-xs font-bold text-white">ML Classifier</p>
              <p className="text-[11px] text-slate-400">RandomForest / MLP Confidence Prediction</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 block">STAGE 5</span>
              <p className="text-xs font-bold text-white">Speech & History</p>
              <p className="text-[11px] text-slate-400">Debounced TTS Audio + SQLite Persistence</p>
            </div>
          </div>
        </div>
      </section>

      {/* Object-Oriented Architecture Table */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <span>Object-Oriented Architecture (OOP Classes)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Decoupled classes adhering to SOLID principles, separation of concerns, and design patterns.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[11px] text-slate-400">
                <th className="p-3 w-1/4">Class Name</th>
                <th className="p-3 w-1/2">Core Responsibility & Encapsulation</th>
                <th className="p-3 w-1/4">OOP Design Pattern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {oopClasses.map((cls) => (
                <tr key={cls.name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-cyan-300">{cls.name}</td>
                  <td className="p-3 text-slate-300 leading-relaxed">{cls.responsibility}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">{cls.pattern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Technical Specifications & Methodology */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Spatial Normalization Mathematics</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Raw landmark coordinates $(x, y, z)$ fluctuate dramatically with webcam distance and user position. LandmarkNormalizer applies a 2-step geometric transformation:
          </p>
          <div className="p-3 rounded bg-slate-950 font-mono text-[11px] text-cyan-300 space-y-1">
            <p>1. Translation Invariance: P_rel = P_i - P_wrist</p>
            <p>2. Scale Invariance: P_norm = P_rel / max(||P_rel||)</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            This produces coordinate features strictly normalized in $[-1.0, 1.0]$, ensuring that signs performed close to the lens or far away produce identical feature representations.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Temporal Debounce Filtering</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            A key challenge in sign language recognition is preventing repeated word triggers while a user holds their hand stationary:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Requires 8 consecutive frames of stable prediction to qualify.</li>
            <li>Enforces a 1.2-second cooldown before the same gesture can re-trigger without a hand state reset.</li>
            <li>Filters confidence below the configurable threshold (default 70%) to avoid false positives.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};
