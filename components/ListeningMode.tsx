import React, { useState, useEffect, useRef } from 'react';
import { Headphones, BookOpen, Play, Pause, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { ListeningExercise, ListeningType } from '../types';

export const ListeningMode: React.FC = () => {
  const [mode, setMode] = useState<ListeningType | null>(null);
  const [level, setLevel] = useState('B1');
  const [isLoading, setIsLoading] = useState(false);
  const [exercise, setExercise] = useState<ListeningExercise | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateExercise = async (type: ListeningType) => {
    setIsLoading(true);
    setMode(type);
    setExercise(null);
    setAudioUrl(null);
    setSelectedAnswers({});
    setShowResults(false);

    try {
      const data = await GeminiService.generateListeningExercise(type, level);
      setExercise(data);

      if (type === ListeningType.AUDIO) {
        const audioBuffer = await GeminiService.generateSpeech(data.content);
        // Create a Blob from the WAV buffer
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch (error) {
      console.error("Failed to load exercise", error);
      alert("Failed to generate exercise. Please check your API key.");
      setMode(null);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleOptionSelect = (questionId: number, optionIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  if (!mode) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="text-3xl font-bold text-slate-800">Choose Your Practice</h2>
        <div className="flex justify-center gap-4 mb-8">
             <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className="p-2 border rounded bg-white text-slate-700"
             >
                <option value="A1">A1 (Beginner)</option>
                <option value="A2">A2 (Elementary)</option>
                <option value="B1">B1 (Intermediate)</option>
                <option value="B2">B2 (Upper Intermediate)</option>
                <option value="C1">C1 (Advanced)</option>
             </select>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => generateExercise(ListeningType.ARTICLE)}
            className="group p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Article Reading</h3>
            <p className="text-slate-500">Read short texts and answer questions.</p>
          </button>

          <button
            onClick={() => generateExercise(ListeningType.AUDIO)}
            className="group p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Headphones className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Audio Comprehension</h3>
            <p className="text-slate-500">Listen to generated speech and test your understanding.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => setMode(null)} 
        className="mb-6 text-slate-500 hover:text-indigo-600 flex items-center gap-2"
      >
        ← Back to Selection
      </button>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
           <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
           <p className="text-slate-500">Generating {mode === ListeningType.AUDIO ? 'Audio' : 'Content'}...</p>
        </div>
      ) : exercise ? (
        <div className="space-y-8">
          {/* Content Section */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              {mode === ListeningType.ARTICLE ? <BookOpen className="w-6 h-6 text-indigo-500"/> : <Headphones className="w-6 h-6 text-emerald-500"/>}
              {mode === ListeningType.ARTICLE ? "Read the Article" : "Listen Carefully"}
            </h3>

            {mode === ListeningType.ARTICLE ? (
              <div className="prose prose-slate max-w-none leading-relaxed text-lg text-slate-700">
                {exercise.content}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8">
                {audioUrl && (
                  <>
                    <audio 
                        ref={audioRef} 
                        src={audioUrl} 
                        onEnded={() => setIsPlaying(false)}
                        onPause={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        className="hidden"
                    />
                    <button
                      onClick={togglePlay}
                      className="w-20 h-20 flex items-center justify-center bg-indigo-600 rounded-full text-white hover:bg-indigo-700 transition-colors shadow-lg"
                    >
                      {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 ml-1 fill-current" />}
                    </button>
                    <p className="mt-4 text-slate-500 text-sm">Click to play audio</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Questions Section */}
          <div className="space-y-6">
            {exercise.questions.map((q, qIdx) => {
              const isCorrect = selectedAnswers[q.id] === q.correctOptionIndex;
              const hasAnswered = selectedAnswers[q.id] !== undefined;

              return (
                <div key={q.id} className={`bg-white rounded-xl p-6 shadow-sm border transition-colors ${showResults ? (isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-slate-200'}`}>
                  <p className="font-medium text-slate-800 mb-4">{qIdx + 1}. {q.questionText}</p>
                  <div className="space-y-3">
                    {q.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(q.id, idx)}
                        disabled={showResults}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          selectedAnswers[q.id] === idx
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        } ${
                            showResults && idx === q.correctOptionIndex 
                            ? '!border-green-500 !bg-green-100 !text-green-800' 
                            : ''
                        } ${
                            showResults && selectedAnswers[q.id] === idx && idx !== q.correctOptionIndex
                            ? '!border-red-500 !bg-red-100 !text-red-800'
                            : ''
                        }
                        `}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  
                  {showResults && (
                    <div className="mt-4 p-4 bg-white/50 rounded-lg border border-slate-200/50">
                        <div className="flex items-center gap-2 font-bold mb-1">
                            {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600"/> : <XCircle className="w-5 h-5 text-red-600"/>}
                            <span className={isCorrect ? "text-green-700" : "text-red-700"}>
                                {isCorrect ? "Correct!" : "Incorrect"}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600">
                            <span className="font-semibold text-indigo-900">Açıklama: </span> 
                            {q.explanationTR}
                        </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-4 pb-12">
            {!showResults ? (
                <button
                onClick={checkAnswers}
                disabled={Object.keys(selectedAnswers).length !== exercise.questions.length}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                Check Answers
                </button>
            ) : (
                <button
                onClick={() => generateExercise(mode)}
                className="px-8 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 flex items-center gap-2 transition-colors"
                >
                <RotateCcw className="w-5 h-5"/>
                New Exercise
                </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};