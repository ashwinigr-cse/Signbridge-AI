import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Interpreter } from './pages/Interpreter';
import { DatasetManager } from './pages/DatasetManager';
import { ModelTraining } from './pages/ModelTraining';
import { History } from './pages/History';
import { About } from './pages/About';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'interpreter' | 'dataset' | 'training' | 'history' | 'about'>('home');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar Contract Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {activeTab === 'home' && <Home onNavigate={setActiveTab} />}
        {activeTab === 'interpreter' && <Interpreter />}
        {activeTab === 'dataset' && <DatasetManager />}
        {activeTab === 'training' && <ModelTraining />}
        {activeTab === 'history' && <History />}
        {activeTab === 'about' && <About />}
      </main>

      {/* Quiet Technical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">SignBridge AI</span>
            <span>·</span>
            <span>Indian Sign Language Recognition Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>MediaPipe Hands</span>
            <span>·</span>
            <span>Scikit-Learn</span>
            <span>·</span>
            <span>FastAPI</span>
            <span>·</span>
            <span>SQLite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
