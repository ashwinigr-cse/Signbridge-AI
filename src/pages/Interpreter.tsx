import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Plus,
  Delete,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Settings2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { HandCanvas } from '../components/HandCanvas';
import { api } from '../services/api';
import { speechService } from '../services/speech';
import { LandmarkPoint, PredictionResult, AppSettings } from '../types';
import confetti from 'canvas-confetti';

export const Interpreter: React.FC = () => {
  // Camera & recognition states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [handCount, setHandCount] = useState<number>(0);
  const [lastEventWord, setLastEventWord] = useState<string | null>(null);
  const [recentTranscripts, setRecentTranscripts] = useState<Array<{ word: string; time: string; confidence: number }>>([]);

  // Sentence Builder states
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState<string>('');
  const [isAutoAddEnabled, setIsAutoAddEnabled] = useState<boolean>(true);
  const [sentenceSaveSuccess, setSentenceSaveSuccess] = useState<boolean>(false);

  // Audio / Text-to-Speech states
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [autoSpeakWords, setAutoSpeakWords] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>('default');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.70);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Throttling prediction requests to prevent overwhelming network/API
  const lastInferenceTimeRef = useRef<number>(0);
  const isInferringRef = useRef<boolean>(false);

  // Load voices and app settings
  useEffect(() => {
    async function loadInitial() {
      try {
        const settings = await api.getSettings().catch(() => null);
        if (settings) {
          setConfidenceThreshold(settings.confidence_threshold);
          setSpeechRate(settings.speech_rate);
          setSpeechPitch(settings.speech_pitch);
          setSelectedVoice(settings.selected_voice);
          setAudioEnabled(settings.audio_enabled);
        }
      } catch (err) {}

      // Load Speech Voices
      const updateVoices = () => {
        const voices = speechService.getVoices();
        const uniqueVoices: SpeechSynthesisVoice[] = [];
        const seen = new Set<string>();
        for (const v of voices) {
          const key = v.voiceURI || `${v.name}_${v.lang}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueVoices.push(v);
          }
        }
        setAvailableVoices(uniqueVoices);
      };

      updateVoices();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }

    loadInitial();
  }, []);

  // Debouncing refs for real-time gesture stabilization
  const consecutiveGestureRef = useRef<{ gesture: string; count: number }>({ gesture: '', count: 0 });
  const lastEventTimeRef = useRef<number>(0);
  const lastEventGestureRef = useRef<string>('');

  // Handle incoming hand landmarks from the HandCanvas
  const handleLandmarksDetected = useCallback(
    async (landmarks: LandmarkPoint[], detectedHands: number, localClassification?: any) => {
      setHandCount(detectedHands);

      if (detectedHands === 0 || landmarks.length < 21) {
        consecutiveGestureRef.current = { gesture: '', count: 0 };
        setPrediction((prev) =>
          prev
            ? {
                ...prev,
                gesture: 'No Hand Detected',
                confidence: 0,
                is_recognized: false,
                hand_count: 0,
                status_message: 'Keep hand visible in frame.',
              }
            : null
        );
        return;
      }

      // 1. Immediately apply zero-latency local geometric classification if provided
      if (localClassification) {
        setPrediction({
          gesture: localClassification.gesture,
          confidence: localClassification.confidence,
          is_recognized: localClassification.isRecognized,
          is_new_event: false,
          hand_count: detectedHands,
          timestamp: new Date().toISOString(),
          status_message: localClassification.statusMessage,
        });

        // Client-side temporal debouncing:
        // If a recognized sign is held stable for 4 consecutive frames (~130ms)
        if (localClassification.isRecognized && localClassification.confidence >= confidenceThreshold) {
          const gest = localClassification.gesture;
          if (consecutiveGestureRef.current.gesture === gest) {
            consecutiveGestureRef.current.count += 1;
          } else {
            consecutiveGestureRef.current = { gesture: gest, count: 1 };
          }

          const now = Date.now();
          const isHeld = consecutiveGestureRef.current.count >= 4;
          const isDifferent = gest !== lastEventGestureRef.current;
          const isCooldownPassed = now - lastEventTimeRef.current > 1800;

          if (isHeld && (isDifferent || isCooldownPassed)) {
            lastEventTimeRef.current = now;
            lastEventGestureRef.current = gest;
            setLastEventWord(gest);

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setRecentTranscripts((prev) => [
              { word: gest, time: timeStr, confidence: localClassification.confidence },
              ...prev.filter((p) => p.word !== gest || p.time !== timeStr).slice(0, 6),
            ]);

            // Auto-speak word if enabled
            if (audioEnabled && autoSpeakWords) {
              speechService.speak(gest, {
                rate: speechRate,
                pitch: speechPitch,
                voiceName: selectedVoice,
              });
            }

            // Auto-add to sentence if enabled
            if (isAutoAddEnabled) {
              setSentenceWords((prev) => {
                if (prev.length > 0 && prev[prev.length - 1].toLowerCase() === gest.toLowerCase()) {
                  return prev;
                }
                return [...prev, gest];
              });
            }
          }
        }
      }

      // 2. Throttle backend sync to once every 200ms
      const now = Date.now();
      if (now - lastInferenceTimeRef.current < 200 || isInferringRef.current) {
        return;
      }

      isInferringRef.current = true;
      lastInferenceTimeRef.current = now;

      try {
        const result = await api.predict(landmarks, detectedHands);
        // Only override if backend returned a confident prediction
        if (result && result.is_recognized) {
          setPrediction(result);
        }
      } catch (err) {
        // Backend failure shouldn't disrupt client-side live tracking
      } finally {
        isInferringRef.current = false;
      }
    },
    [confidenceThreshold, audioEnabled, autoSpeakWords, isAutoAddEnabled, speechRate, speechPitch, selectedVoice]
  );

  // Sentence Operations
  const handleAddWordManually = (word: string) => {
    if (!word.trim()) return;
    setSentenceWords((prev) => [...prev, word.trim()]);
    setManualInput('');
  };

  const handleRemoveLastWord = () => {
    setSentenceWords((prev) => prev.slice(0, -1));
  };

  const handleClearSentence = () => {
    setSentenceWords([]);
  };

  const handleAddPunctuation = (punct: string) => {
    setSentenceWords((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = updated[updated.length - 1] + punct;
      return updated;
    });
  };

  const getFullSentence = (): string => {
    if (sentenceWords.length === 0) return '';
    const raw = sentenceWords.join(' ');
    const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!['.', '?', '!'].includes(formatted.slice(-1))) {
      return formatted + '.';
    }
    return formatted;
  };

  const handleSaveSentence = async () => {
    const full = getFullSentence();
    if (!full) return;

    try {
      await api.sentenceAction('clear');
      for (const w of sentenceWords) {
        await api.sentenceAction('add', w);
      }
      await api.saveSentence();

      setSentenceSaveSuccess(true);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
      setTimeout(() => setSentenceSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save sentence:', err);
    }
  };

  const handleSpeakSentence = () => {
    const full = getFullSentence();
    if (!full || !audioEnabled) return;

    setIsSpeaking(true);
    speechService.speak(full, {
      rate: speechRate,
      pitch: speechPitch,
      voiceName: selectedVoice,
      force: true,
    });
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  const handleStopSpeech = () => {
    speechService.stop();
    setIsSpeaking(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Console Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Live ISL Interpreter</h1>
            <span className="text-xs font-mono text-cyan-400">
              {isCameraActive ? 'LIVE INFERENCE' : 'STANDBY'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Articulate gestures towards camera; 21 hand joints track dynamically with scale invariance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all ${
              isCameraActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {isCameraActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isCameraActive ? 'Stop Camera' : 'Start Interpreter'}</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Speech and Recognition Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Camera Feed & Real-time Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <HandCanvas
              isActive={isCameraActive}
              onLandmarksDetected={handleLandmarksDetected}
              confidenceThreshold={confidenceThreshold}
            />

            {/* In-feed status telemetry overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 z-10">
              <span className="text-cyan-400 font-semibold">{handCount} Hand{handCount === 1 ? '' : 's'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Threshold: {(confidenceThreshold * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Quick Recent Transcripts Strip */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Stream:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {recentTranscripts.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No recognized words in buffer yet</span>
              ) : (
                recentTranscripts.map((item, idx) => (
                  <div
                    key={`${item.time}-${idx}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-xs shrink-0"
                  >
                    <span className="font-semibold text-white">{item.word}</span>
                    <span className="text-[10px] font-mono text-cyan-400 tabular-nums">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Real-time Recognition & Sentence Builder */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Gesture Recognition Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Current Recognition</span>
              <span
                className={`text-xs font-semibold ${
                  prediction?.is_recognized
                    ? 'text-emerald-400'
                    : handCount > 0
                    ? 'text-amber-400'
                    : 'text-slate-500'
                }`}
              >
                {prediction?.is_recognized
                  ? 'Recognized'
                  : handCount > 0
                  ? 'Analyzing Pose...'
                  : 'Idle'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-between">
                <span>{prediction?.is_recognized ? prediction.gesture : '—'}</span>
                {prediction?.is_recognized && (
                  <button
                    onClick={() => handleAddWordManually(prediction.gesture)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Append</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {prediction?.status_message || 'Awaiting hand gestures in video stream.'}
              </p>
            </div>

            {/* Confidence Gauge */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Confidence Metric</span>
                <span className="text-white font-bold tabular-nums">
                  {prediction ? `${(prediction.confidence * 100).toFixed(1)}%` : '0.0%'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    prediction && prediction.confidence >= confidenceThreshold
                      ? 'bg-emerald-400'
                      : prediction && prediction.confidence > 0.4
                      ? 'bg-amber-400'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (prediction?.confidence || 0) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sentence Construction Console */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Sentence Builder</h3>
                <span className="text-[11px] font-mono text-slate-400">
                  ({sentenceWords.length} token{sentenceWords.length === 1 ? '' : 's'})
                </span>
              </div>

              {/* Auto-add toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAutoAddEnabled}
                  onChange={(e) => setIsAutoAddEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-800"
                />
                <span>Auto-append</span>
              </label>
            </div>

            {/* Assembled Sentence Display Window */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 min-h-[90px] flex flex-col justify-between">
              <p className="text-base font-medium text-slate-100 leading-relaxed">
                {getFullSentence() || (
                  <span className="text-slate-500 italic text-sm">
                    Recognized gestures will assemble here into a continuous phrase...
                  </span>
                )}
              </p>

              {sentenceWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {sentenceWords.map((w, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-cyan-300 border border-slate-700/60"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Punctuation & Editing Toolbar */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleAddPunctuation(',')}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                >
                  ,
                </button>
                <button
                  onClick={() => handleAddPunctuation('?')}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                >
                  ?
                </button>
                <button
                  onClick={() => handleAddPunctuation('.')}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                >
                  .
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemoveLastWord}
                  disabled={sentenceWords.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded border border-slate-700 transition-colors"
                  title="Remove last word"
                >
                  <Delete className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
                <button
                  onClick={handleClearSentence}
                  disabled={sentenceWords.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-40 disabled:cursor-not-allowed rounded border border-rose-800/40 transition-colors"
                  title="Clear sentence"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Manual Text Insertion Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWordManually(manualInput);
                }}
                placeholder="Manual text correction..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                onClick={() => handleAddWordManually(manualInput)}
                disabled={!manualInput.trim()}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-lg transition-colors"
              >
                Insert
              </button>
            </div>

            {/* Actions: Speak & Save */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSpeakSentence}
                  disabled={sentenceWords.length === 0 || !audioEnabled}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-cyan-500/20 transition-all active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeaking ? 'Speaking...' : 'Speak Sentence'}</span>
                </button>

                {isSpeaking && (
                  <button
                    onClick={handleStopSpeech}
                    className="p-2 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 rounded-lg border border-rose-800/60"
                    title="Stop audio playback"
                  >
                    <VolumeX className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleSaveSentence}
                disabled={sentenceWords.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-slate-700 transition-colors"
              >
                {sentenceSaveSuccess ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                <span>{sentenceSaveSuccess ? 'Saved to DB!' : 'Save Sentence'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal Dialog */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Interpreter Configuration</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Confidence Threshold</span>
                  <span className="font-mono tabular-nums text-cyan-400 font-bold">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <p className="text-[11px] text-slate-400">
                  Predictions below this confidence are filtered to prevent inaccurate translations.
                </p>
              </div>

              {/* Audio Master Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-medium text-slate-200">Text-to-Speech Engine</p>
                  <p className="text-[11px] text-slate-400">Enable synthesized voice pronunciation</p>
                </div>
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 bg-slate-800"
                />
              </div>

              {/* Auto Speak Words */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-200">Auto-Speak Individual Words</p>
                  <p className="text-[11px] text-slate-400">Speak each recognized sign immediately</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSpeakWords}
                  onChange={(e) => setAutoSpeakWords(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 bg-slate-800"
                />
              </div>

              {/* Voice Selector */}
              {availableVoices.length > 0 && (
                <div className="space-y-1">
                  <label className="text-slate-300">Synthesizer Voice</label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="default">System Default Voice</option>
                    {availableVoices.map((v, idx) => (
                      <option key={`${v.voiceURI || v.name}-${v.lang}-${idx}`} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Speech Speed / Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Speech Rate</span>
                  <span className="font-mono tabular-nums text-cyan-400">{speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  api.updateSettings({
                    confidence_threshold: confidenceThreshold,
                    debounce_frames: 8,
                    speech_rate: speechRate,
                    speech_pitch: speechPitch,
                    selected_voice: selectedVoice,
                    audio_enabled: audioEnabled,
                  });
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
              >
                Apply & Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
