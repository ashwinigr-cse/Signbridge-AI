import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  Activity
} from 'lucide-react';
import { HandCanvas } from '../components/HandCanvas';
import { api } from '../services/api';
import { DatasetSummary, GestureSample, LandmarkPoint } from '../types';
import confetti from 'canvas-confetti';

export const DatasetManager: React.FC = () => {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [samples, setSamples] = useState<GestureSample[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLabel, setSelectedLabel] = useState<string>('Namaste');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [handType, setHandType] = useState<string>('Right');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [lastDetectedLandmarks, setLastDetectedLandmarks] = useState<LandmarkPoint[]>([]);
  const [currentHandCount, setCurrentHandCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBurstMode, setIsBurstMode] = useState<boolean>(false);
  const [burstCount, setBurstCount] = useState<number>(0);

  // Load summary and samples
  const refreshDataset = async () => {
    setLoading(true);
    try {
      const [sumRes, samRes] = await Promise.all([
        api.getDatasetSummary(),
        api.getDatasetSamples(),
      ]);
      setSummary(sumRes);
      setSamples(samRes);
    } catch (err: any) {
      console.error('Failed to load dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDataset();
  }, []);

  // Update landmarks when detected from camera
  const handleLandmarks = (landmarks: LandmarkPoint[], count: number) => {
    setLastDetectedLandmarks(landmarks);
    setCurrentHandCount(count);
  };

  // Capture single sample
  const handleCaptureSample = async () => {
    const label = customLabel.trim() || selectedLabel;
    if (!label) {
      setStatusMessage('Please select or enter a gesture label.');
      return;
    }
    if (lastDetectedLandmarks.length < 21) {
      setStatusMessage('No valid hand detected in camera view to capture.');
      return;
    }

    try {
      const res = await api.recordSample(label, lastDetectedLandmarks, handType);
      setStatusMessage(`Captured sample #${res.id} for "${label}".`);
      await refreshDataset();
    } catch (err: any) {
      setStatusMessage(`Capture failed: ${err.message}`);
    }
  };

  // Burst recording mode (captures 10 samples with slight movements)
  const handleStartBurstCapture = async () => {
    const label = customLabel.trim() || selectedLabel;
    if (!label) return;
    if (lastDetectedLandmarks.length < 21) {
      setStatusMessage('Hold your hand steady in camera view before starting burst.');
      return;
    }

    setIsBurstMode(true);
    setBurstCount(0);
    setStatusMessage(`Burst recording: 10 samples for "${label}"...`);

    let count = 0;
    const interval = setInterval(async () => {
      if (count >= 10) {
        clearInterval(interval);
        setIsBurstMode(false);
        setStatusMessage(`Successfully collected 10 samples for "${label}".`);
        confetti({ particleCount: 25, spread: 50 });
        await refreshDataset();
        return;
      }

      if (lastDetectedLandmarks.length >= 21) {
        try {
          await api.recordSample(label, lastDetectedLandmarks, handType, `burst_${Date.now()}`);
          count++;
          setBurstCount(count);
        } catch (e) {}
      }
    }, 280);
  };

  // Delete sample
  const handleDeleteSample = async (id: number) => {
    try {
      await api.deleteSample(id);
      await refreshDataset();
    } catch (err) {
      console.error('Delete sample error:', err);
    }
  };

  // Seed baseline ISL dataset
  const handleSeedBaseline = async () => {
    setLoading(true);
    try {
      const res = await api.seedDataset();
      setStatusMessage(res.message);
      confetti({ particleCount: 40, spread: 70 });
      await refreshDataset();
    } catch (err: any) {
      setStatusMessage(`Seed error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear dataset
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all collected samples in the dataset?')) return;
    setLoading(true);
    try {
      await api.clearDataset();
      setStatusMessage('Dataset cleared.');
      await refreshDataset();
    } catch (err: any) {
      setStatusMessage(`Clear error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentActiveLabel = customLabel.trim() || selectedLabel;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Dataset Manager</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture, label, curate, and review normalized 21-joint skeletal gesture training samples.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedBaseline}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-lg transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seed Baseline ISL Dataset</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={loading || (summary?.total_samples || 0) === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Dataset Health & Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs uppercase font-mono text-slate-400">Total Samples</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
            {summary?.total_samples ?? 0}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs uppercase font-mono text-slate-400">Distinct Classes</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
            {summary?.total_classes ?? 0}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs uppercase font-mono text-slate-400">Active Target Label</p>
          <p className="text-lg font-bold text-cyan-400 truncate mt-1">
            {currentActiveLabel}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-xs uppercase font-mono text-slate-400">Dataset Health</p>
          <p className="text-xs text-slate-300 font-medium mt-2 leading-relaxed">
            {summary?.health_status || 'Initializing...'}
          </p>
        </div>
      </div>

      {/* Main Studio Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Camera Capture Studio */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Webcam Sample Recorder</span>
              </h2>

              <button
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isCameraActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
              >
                {isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
              </button>
            </div>

            <HandCanvas
              isActive={isCameraActive}
              onLandmarksDetected={handleLandmarks}
            />

            {/* Recording Controls */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Select Standard ISL Vocabulary */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Select Gesture Label</label>
                  <select
                    value={selectedLabel}
                    onChange={(e) => {
                      setSelectedLabel(e.target.value);
                      setCustomLabel('');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    {(summary?.supported_vocabulary || ['Namaste', 'Hello', 'Thank You', 'Yes', 'No', 'Help', 'Water', 'Food', 'Good', 'Bad', 'Peace']).map((voc, idx) => (
                      <option key={`${voc}-${idx}`} value={voc}>
                        {voc} ({summary?.class_distribution?.[voc] || 0} samples)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Label Input */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Or Custom Sign Name</label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Family, Morning..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Hand Type and Trigger Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Hand:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-800 text-xs">
                    <button
                      onClick={() => setHandType('Right')}
                      className={`px-2.5 py-1 rounded font-medium ${
                        handType === 'Right' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Right
                    </button>
                    <button
                      onClick={() => setHandType('Left')}
                      className={`px-2.5 py-1 rounded font-medium ${
                        handType === 'Left' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Left
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCaptureSample}
                    disabled={!isCameraActive || currentHandCount === 0 || isBurstMode}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Capture Single Frame</span>
                  </button>

                  <button
                    onClick={handleStartBurstCapture}
                    disabled={!isCameraActive || currentHandCount === 0 || isBurstMode}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                  >
                    <Activity className="w-4 h-4" />
                    <span>{isBurstMode ? `Recording ${burstCount}/10...` : 'Burst (10 Samples)'}</span>
                  </button>
                </div>
              </div>

              {statusMessage && (
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Class Distribution & Samples Catalog */}
        <div className="lg:col-span-5 space-y-4">
          {/* Class Distribution Breakdown */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white">Class Distribution</h2>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {!summary?.class_distribution || Object.keys(summary.class_distribution).length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No classes in dataset yet. Click &quot;Seed Baseline ISL Dataset&quot; to bootstrap.
                </p>
              ) : (
                Object.entries(summary.class_distribution).map(([cls, cnt]) => {
                  const maxSamples = Math.max(...Object.values(summary.class_distribution), 20);
                  const pct = Math.min(100, Math.round((cnt / maxSamples) * 100));
                  return (
                    <div key={cls} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">{cls}</span>
                        <span className="font-mono text-cyan-400 tabular-nums">{cnt} samples</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Samples Table */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Recorded Samples ({samples.length})</h2>
              <button
                onClick={refreshDataset}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {samples.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Dataset is currently empty.
                </p>
              ) : (
                samples.slice(-25).reverse().map((sample) => (
                  <div
                    key={sample.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{sample.label}</span>
                        <span className="text-[10px] font-mono text-slate-400">#{sample.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        <span>{sample.hand_type} hand</span>
                        <span className="mx-1">·</span>
                        <span>{sample.created_at?.slice(11, 19) || 'Recorded'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSample(sample.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      title="Delete sample"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
