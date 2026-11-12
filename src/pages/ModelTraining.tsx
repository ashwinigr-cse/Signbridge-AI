import React, { useState, useEffect } from 'react';
import {
  Brain,
  Cpu,
  Layers,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';
import { api } from '../services/api';
import { ModelInfo, EvaluationMetrics, DatasetSummary } from '../types';
import confetti from 'canvas-confetti';

export const ModelTraining: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainStatusMessage, setTrainStatusMessage] = useState<string | null>(null);

  // Hyperparameters
  const [modelType, setModelType] = useState<string>('random_forest');
  const [testSize, setTestSize] = useState<number>(0.2);

  const loadData = async () => {
    setLoading(true);
    try {
      const [info, sum] = await Promise.all([
        api.getModelInfo(),
        api.getDatasetSummary(),
      ]);
      setModelInfo(info);
      setSummary(sum);
    } catch (err: any) {
      console.error('Failed to load model info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainStatusMessage('Extracting normalized spatial features and fitting classifier...');

    try {
      const metrics = await api.trainModel(modelType, testSize);
      setTrainStatusMessage(`Training complete! Test accuracy: ${(metrics.accuracy * 100).toFixed(1)}%.`);
      confetti({ particleCount: 50, spread: 80, origin: { y: 0.6 } });
      await loadData();
    } catch (err: any) {
      setTrainStatusMessage(`Training failed: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const metrics = modelInfo?.metrics;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Model Training & Evaluation</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Train Scikit-Learn classification algorithms on normalized 21-joint ISL features with stratified test evaluation.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 rounded-lg border border-slate-800 bg-slate-900 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Model State Status Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              modelInfo?.is_loaded
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}
          >
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {modelInfo?.is_loaded ? 'Active Model In Memory' : 'No Model Loaded'}
              </h2>
              <span className="text-xs font-mono text-cyan-400">
                {modelInfo?.model_type || 'Uninitialized'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {modelInfo?.is_loaded
                ? `Recognizes ${modelInfo.classes.length} distinct Indian Sign Language gestures.`
                : 'Click "Execute Training Pipeline" to train on your collected dataset.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">AVAILABLE SAMPLES</span>
            <span className="text-white font-bold text-base tabular-nums">
              {summary?.total_samples ?? 0}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">CLASSES</span>
            <span className="text-white font-bold text-base tabular-nums">
              {summary?.total_classes ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Split Grid: Hyperparameters on Left, Metrics & Confusion Matrix on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Training Configuration Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Training Hyperparameters</span>
            </h2>

            {/* Model Architecture Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">Model Architecture</label>
              <div className="space-y-2">
                {[
                  {
                    id: 'random_forest',
                    name: 'Random Forest Classifier',
                    desc: 'Ensemble of 120 decision trees. Highly robust against joint noise and lighting variations.',
                  },
                  {
                    id: 'mlp',
                    name: 'Multi-Layer Perceptron (Neural Net)',
                    desc: 'Deep architecture (128 -> 64 ReLU units) for complex non-linear gesture boundaries.',
                  },
                  {
                    id: 'gradient_boosting',
                    name: 'Gradient Boosting Classifier',
                    desc: 'Sequential residual boosting trees maximizing decision margin across subtle finger curves.',
                  },
                  {
                    id: 'svm',
                    name: 'Support Vector Machine (RBF)',
                    desc: 'Radial basis function kernel for high-dimensional spatial hyperplanes.',
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setModelType(item.id)}
                    className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                      modelType === item.id
                        ? 'bg-slate-800/90 border-cyan-500/80 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <input
                        type="radio"
                        name="model_type"
                        checked={modelType === item.id}
                        onChange={() => setModelType(item.id)}
                        className="text-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Test Split Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Hold-out Validation / Test Split</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {(testSize * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.3"
                step="0.05"
                value={testSize}
                onChange={(e) => setTestSize(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <p className="text-[11px] text-slate-400">
                Data is partitioned into stratified train/test sets to prevent statistical overfitting.
              </p>
            </div>

            {/* Train Button */}
            <div className="pt-2">
              <button
                onClick={handleTrainModel}
                disabled={isTraining || (summary?.total_samples || 0) < 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
              >
                {isTraining ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Fitting Estimator...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Execute Training Pipeline</span>
                  </>
                )}
              </button>

              {(summary?.total_samples || 0) < 6 && (
                <p className="text-[11px] text-amber-400/90 text-center mt-2">
                  Dataset requires at least 6 samples to initiate training. Please seed or capture samples first.
                </p>
              )}
            </div>

            {trainStatusMessage && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
                {trainStatusMessage}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actual Evaluation Metrics & Confusion Matrix */}
        <div className="lg:col-span-7 space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-xs uppercase font-mono text-slate-400">Accuracy</p>
              <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
                {metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-xs uppercase font-mono text-slate-400">Precision</p>
              <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
                {metrics ? `${(metrics.precision * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-xs uppercase font-mono text-slate-400">Recall</p>
              <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
                {metrics ? `${(metrics.recall * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-xs uppercase font-mono text-slate-400">F1-Score</p>
              <p className="text-2xl font-mono font-bold text-cyan-400 tabular-nums mt-1">
                {metrics ? `${(metrics.f1_score * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          {/* Confusion Matrix Heatmap */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Confusion Matrix Heatmap</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual classes (vertical) versus Predicted classes (horizontal) on held-out test data.
                </p>
              </div>

              {metrics && (
                <span className="text-[11px] font-mono text-slate-400">
                  Test Samples: {metrics.test_samples}
                </span>
              )}
            </div>

            {!metrics?.confusion_matrix || metrics.confusion_matrix.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950 rounded-lg border border-slate-800">
                Train a model to generate empirical confusion matrix.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-mono text-[10px] text-slate-500 border-b border-slate-800">
                        ACTUAL \ PRED
                      </th>
                      {metrics.class_names.map((name, idx) => (
                        <th
                          key={`${name}-${idx}`}
                          className="p-2 text-center font-mono text-[10px] text-slate-400 border-b border-slate-800 whitespace-nowrap"
                        >
                          {name.length > 7 ? name.slice(0, 6) + '..' : name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.confusion_matrix.map((row, rIdx) => {
                      const actualName = metrics.class_names[rIdx] || `C${rIdx}`;
                      return (
                        <tr key={rIdx} className="hover:bg-slate-800/40">
                          <td className="p-2 font-mono text-[11px] font-bold text-slate-300 border-r border-slate-800 whitespace-nowrap">
                            {actualName}
                          </td>
                          {row.map((val, cIdx) => {
                            const isDiagonal = rIdx === cIdx;
                            const isHigh = val > 0 && isDiagonal;
                            return (
                              <td
                                key={cIdx}
                                className={`p-2 text-center font-mono tabular-nums text-xs ${
                                  isHigh
                                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                    : val > 0
                                    ? 'bg-rose-500/20 text-rose-300 font-bold'
                                    : 'text-slate-600'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Serialization Metadata */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Model Artifact:</span>
              <span className="text-slate-200">trained_models/isl_classifier.joblib</span>
            </div>
            <div className="flex justify-between">
              <span>Encoder Artifact:</span>
              <span className="text-slate-200">trained_models/label_encoder.joblib</span>
            </div>
            <div className="flex justify-between">
              <span>Last Trained:</span>
              <span className="text-slate-200">{metrics?.trained_at ? new Date(metrics.trained_at).toLocaleString() : 'Pre-calibrated'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
