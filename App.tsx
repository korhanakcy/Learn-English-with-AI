import React, { useState } from 'react';
import { Mic, Headphones, Book, Menu, X, Heart } from 'lucide-react';
import { AppMode } from './types';
import { SpeakingMode } from './components/SpeakingMode';
import { ListeningMode } from './components/ListeningMode';
import { GrammarMode } from './components/GrammarMode';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SPEAKING);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: AppMode.SPEAKING, label: 'Speaking Coach', icon: <Mic className="w-5 h-5" /> },
    { id: AppMode.LISTENING, label: 'Listening Practice', icon: <Headphones className="w-5 h-5" /> },
    { id: AppMode.GRAMMAR, label: 'Grammar Master', icon: <Book className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-8">
            <div className="flex items-center gap-3 text-indigo-600 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <Heart className="w-6 h-6 text-pink-500 fill-current" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                    Elif's Personal<br/>English Assistant
                </h1>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1 ml-1">by Manitası</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentMode(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-200 font-medium ${
                currentMode === item.id
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-semibold text-sm text-slate-800 mb-1">Korhan</h4>
                <p className="text-xs text-slate-500 leading-relaxed italic">"I love my girlfriend."</p>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
             <div className="p-1.5 bg-indigo-100 rounded-md text-pink-500">
                <Heart className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm">Elif's English Assistant</span>
                <span className="text-[10px] text-slate-500">by Manitası</span>
            </div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-white pt-20 px-4">
            <nav className="space-y-2">
                {navItems.map((item) => (
                    <button
                    key={item.id}
                    onClick={() => {
                        setCurrentMode(item.id);
                        setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium ${
                        currentMode === item.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500'
                    }`}
                    >
                    {item.icon}
                    {item.label}
                    </button>
                ))}
            </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
            <header className="mb-8 md:mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                    {navItems.find(n => n.id === currentMode)?.label}
                </h2>
                <p className="text-slate-500 text-lg">
                    {currentMode === AppMode.SPEAKING && "Practice conversation with strict, real-time feedback."}
                    {currentMode === AppMode.LISTENING && "Improve comprehension with articles and AI-generated audio."}
                    {currentMode === AppMode.GRAMMAR && "Master rules with clear explanations and targeted exercises."}
                </p>
            </header>

            {currentMode === AppMode.SPEAKING && <SpeakingMode />}
            {currentMode === AppMode.LISTENING && <ListeningMode />}
            {currentMode === AppMode.GRAMMAR && <GrammarMode />}
        </div>
      </main>
    </div>
  );
};

export default App;