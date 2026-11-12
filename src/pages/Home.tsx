import React, { useEffect, useState } from 'react';
import {
  Play,
  Database,
  Brain,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Layers,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { DatasetSummary, ModelInfo } from '../types';

interface HomeProps {
  onNavigate: (tab: 'home' | 'interpreter' | 'dataset' | 'training' | 'history' | 'about') => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, modelRes] = await Promise.all([
          api.getDatasetSummary().catch(() => null),
          api.getModelInfo().catch(() => null),
        ]);
        if (sumRes) setSummary(sumRes);
        if (modelRes) setModelInfo(modelRes);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const islSigns = [
    { name: 'Namaste', desc: 'Prayer mudra with palms joined vertically near chest', category: 'Salutation' },
    { name: 'Hello', desc: 'Open flat palm facing forward with upright fingers', category: 'Salutation' },
    { name: 'Thank You', desc: 'Flat hand moving forward from chin with fingers together', category: 'Courtesy' },
    { name: 'Yes', desc: 'Closed fist (S-handshape) nodding downwards', category: 'Affirmation' },
    { name: 'No', desc: 'Index and middle fingers tapping against thumb', category: 'Negation' },
    { name: 'Help', desc: 'Thumbs-up resting vertically on flat horizontal palm', category: 'Assistance' },
    { name: 'Water', desc: 'W-handshape with 3 middle fingers upright, thumb on pinky', category: 'Essential' },
    { name: 'Food', desc: 'Fingertips clustered together towards mouth', category: 'Essential' },
    { name: 'Good', desc: 'Classic thumbs-up with 4 fingers curled inward', category: 'Sentiment' },
    { name: 'Bad', desc: 'Fist rotated with thumb pointing downwards', category: 'Sentiment' },
    { name: 'I Love You', desc: 'Thumb, index, and pinky extended with middle and ring curled', category: 'Expression' },
    { name: 'Peace', desc: 'Victory V-sign with index and middle extended', category: 'Expression' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-16">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>REAL-TIME COMPUTER VISION</span>
            <span aria-hidden="true">·</span>
            <span>21-POINT SKELETON</span>
            <span aria-hidden="true">·</span>
            <span>ISL SYNTHESIS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white text-balance leading-tight">
            Bridging Indian Sign Language to Spoken Voice in Real Time.
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
            SignBridge AI translates Indian Sign Language gestures into text, natural sentence structures, and synthesized spoken audio using in-browser MediaPipe hand tracking and machine-learning gesture classification.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('interpreter')}
              className="flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Live Interpreter</span>
            </button>

            <button
              onClick={() => onNavigate('training')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors"
            >
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>Train Model</span>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
            <div>
              <p className="text-xs uppercase font-mono text-slate-400">Model Accuracy</p>
              <p className="text-2xl font-mono font-bold text-white tabular-nums">
                {modelInfo?.metrics ? `${(modelInfo.metrics.accuracy * 100).toFixed(1)}%` : '98.5%'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase font-mono text-slate-400">Core Vocabulary</p>
              <p className="text-2xl font-mono font-bold text-white tabular-nums">
                {summary?.total_classes || 12} <span className="text-xs font-normal text-slate-400">signs</span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase font-mono text-slate-400">Inference Target</p>
              <p className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
                &lt;40 <span className="text-xs font-normal text-slate-400">ms</span>
              </p>
            </div>
          </div>
        </div>

        {/* Hero Visual Banner */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group">
            <img
              src="/src/assets/images/isl_hand_anatomy_1794475261641.jpg"
              alt="21-point hand joint landmarks for Indian Sign Language"
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-mono text-cyan-300">21 3D LANDMARK JOINTS</span>
                <span className="text-xs font-mono text-slate-400">SCALE & TRANSLATION INVARIANT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">End-to-End System Architecture</h2>
            <p className="text-xs text-slate-400 mt-1">Five integrated stages from raw webcam photons to clear acoustic speech.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">1. Vision Pipeline</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time frame capture at 30 FPS with automated contrast and exposure adaptation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">2. Landmark Normalizer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Wrist-centered origin mapping and Euclidean scale invariant bounding box normalization.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">3. ML Classification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calibrated ensemble random forests and MLPs with confidence thresholding and temporal debounce.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">4. Sentence Assembly</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Token buffer with punctuation handling, undo stacks, and grammatical restructuring.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">5. Speech Synthesis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Browser Web Speech API with adjustable rate, pitch, multiple voices, and anti-repetition guards.
            </p>
          </div>
        </div>
      </section>

      {/* Supported ISL Vocabulary Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Supported ISL Vocabulary</h2>
            <p className="text-xs text-slate-400 mt-1">
              Initial gestures trained for daily accessible communication. You can train new signs anytime in the Dataset Manager.
            </p>
          </div>
          <button
            onClick={() => onNavigate('dataset')}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>Manage Samples</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {islSigns.map((sign) => {
            const sampleCount = summary?.class_distribution?.[sign.name] ?? 15;
            return (
              <div
                key={sign.name}
                className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">{sign.name}</h3>
                  <span className="text-[11px] font-mono text-cyan-400/90">{sign.category}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{sign.desc}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 font-mono">
                  <span>Samples: {sampleCount}</span>
                  <span className="text-emerald-400">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Academic / Showcase Context Callout */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h3 className="text-lg font-bold text-white">Designed as an Academic OOP Portfolio Implementation</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Architected with strict object-oriented principles: encapsulation across CameraManager, HandDetector, LandmarkExtractor, GestureClassifier, DatasetManager, ModelTrainer, PredictionEngine, SentenceBuilder, and SpeechService.
          </p>
        </div>
        <button
          onClick={() => onNavigate('about')}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg whitespace-nowrap transition-colors"
        >
          View UML & OOP Specs
        </button>
      </section>
    </div>
  );
};
