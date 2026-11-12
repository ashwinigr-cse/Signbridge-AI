import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  Download,
  FileText,
  Volume2,
  Calendar,
  Layers,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { HistoryItem, SavedSentence } from '../types';
import { speechService } from '../services/speech';

export const History: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'sentences' | 'gestures'>('sentences');

  const loadData = async () => {
    setLoading(true);
    try {
      const [hist, sent] = await Promise.all([
        api.getHistory(150, searchQuery || undefined),
        api.getSavedSentences(100),
      ]);
      setHistoryItems(hist);
      setSavedSentences(sent);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const handleDeleteItem = async (id: number) => {
    try {
      await api.deleteHistoryItem(id);
      setHistoryItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      console.error('Delete history item error:', err);
    }
  };

  const handleDeleteSentence = async (id: number) => {
    try {
      await api.deleteSavedSentence(id);
      setSavedSentences((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Delete sentence error:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all gesture recognition logs?')) return;
    try {
      await api.clearHistory();
      setHistoryItems([]);
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  const handleSpeak = (text: string) => {
    speechService.speak(text, { force: true });
  };

  const filteredSentences = savedSentences.filter((s) =>
    s.sentence.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Transcription History & Logs</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit recognized signs, review constructed sentences, and export transcription transcripts in TXT or CSV format.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getExportUrl('csv')}
            download="signbridge_history.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </a>

          <a
            href={api.getExportUrl('txt')}
            download="signbridge_history.txt"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export TXT</span>
          </a>

          <button
            onClick={handleClearHistory}
            disabled={historyItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Controls: Search & Sub-tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Sub-tab segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('sentences')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'sentences'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Sentences ({savedSentences.length})
          </button>
          <button
            onClick={() => setActiveSubTab('gestures')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'gestures'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Recognized Gestures ({historyItems.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </div>

      {/* Content Area */}
      {activeSubTab === 'sentences' ? (
        /* Sentences View */
        <div className="space-y-3">
          {filteredSentences.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
              No saved sentences match your query. Save sentences from the Live Interpreter tab.
            </div>
          ) : (
            filteredSentences.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-colors flex items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {item.sentence}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.words?.length || 0} gesture tokens</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSpeak(item.sentence)}
                    className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Speak aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSentence(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete sentence"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Gesture Logs Table */
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-[11px] text-slate-400">
                <th className="p-3">ID</th>
                <th className="p-3">Recognized Gesture</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Hands</th>
                <th className="p-3">Source</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {historyItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No gesture recognition logs available.
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-slate-500">#{item.id}</td>
                    <td className="p-3 font-bold text-white">{item.gesture}</td>
                    <td className="p-3 font-mono tabular-nums text-cyan-400">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-slate-400">{item.hand_count}</td>
                    <td className="p-3 font-mono text-slate-400">{item.source}</td>
                    <td className="p-3 font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
