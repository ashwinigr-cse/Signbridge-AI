import React from 'react';
import { Video, Database, Brain, History, Info, Play, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'interpreter' | 'dataset' | 'training' | 'history' | 'about';
  setActiveTab: (tab: 'home' | 'interpreter' | 'dataset' | 'training' | 'history' | 'about') => void;
  isBackendOnline?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isBackendOnline = true }) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand title wordmark */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            SignBridge <span className="text-cyan-400 font-semibold">AI</span>
          </span>
        </button>

        {/* Zone 2: Single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('interpreter')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'interpreter'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Interpreter
          </button>
          <button
            onClick={() => setActiveTab('dataset')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'dataset'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dataset
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'training'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Training
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'history'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'about'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Architecture
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('interpreter')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm shadow-cyan-500/20 transition-all hover:shadow-cyan-400/30 whitespace-nowrap shrink-0 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Live</span>
          </button>
        </div>
      </div>
    </header>
  );
};
