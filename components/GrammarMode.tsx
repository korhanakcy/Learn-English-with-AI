import React, { useState } from 'react';
import { Book, PenTool, ChevronRight, CheckCircle, XCircle, Lightbulb, Loader2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { GrammarLesson } from '../types';

export const GrammarMode: React.FC = () => {
  const [level, setLevel] = useState('A1');
  const [topicInput, setTopicInput] = useState('');
  const [lesson, setLesson] = useState<GrammarLesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const startLesson = async () => {
    setIsLoading(true);
    setLesson(null);
    setUserAnswers({});
    setSubmitted(false);
    try {
      const data = await GeminiService.generateGrammarLesson(level, topicInput || undefined);
      setLesson(data);
    } catch (error) {
      console.error(error);
      alert("Could not generate grammar lesson.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (qId: number, optIdx: number) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Level</label>
            <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
                {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
        </div>
        <div className="flex-[2] w-full">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Topic (Optional)</label>
             <input 
                type="text" 
                placeholder="e.g. Present Perfect vs Simple Past"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
        </div>
        <button 
            onClick={startLesson}
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70 transition-colors"
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Start Lesson"}
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500"/>
            Creating your lesson...
        </div>
      )}

      {lesson && !isLoading && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Lesson Content */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                <div className="bg-indigo-50 p-6 border-b border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-indigo-200 text-indigo-800 text-xs font-bold rounded uppercase">{level}</span>
                        <h2 className="text-2xl font-bold text-slate-900">{lesson.topic}</h2>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500"/> Explanation
                        </h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{lesson.explanation}</p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Examples</h3>
                        <ul className="space-y-3">
                            {lesson.examples.map((ex, i) => (
                                <li key={i} className="flex items-start gap-3 text-slate-700">
                                    <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5"/>
                                    <span>{ex}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Exercises */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-indigo-600"/>
                    Practice Exercises
                </h3>
                
                <div className="grid gap-6">
                    {lesson.exercises.map((q, idx) => {
                         const isCorrect = userAnswers[q.id] === q.correctOptionIndex;
                         const answered = userAnswers[q.id] !== undefined;
                         
                         return (
                            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex gap-4">
                                    <span className="font-bold text-slate-400">{idx + 1}.</span>
                                    <div className="flex-1 space-y-4">
                                        <p className="text-lg text-slate-800 font-medium">{q.questionText}</p>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            {q.options.map((opt, oIdx) => (
                                                <button
                                                    key={oIdx}
                                                    onClick={() => handleAnswer(q.id, oIdx)}
                                                    disabled={submitted}
                                                    className={`
                                                        px-4 py-3 rounded-lg border text-left transition-all
                                                        ${userAnswers[q.id] === oIdx 
                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                                                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                                        }
                                                        ${submitted && oIdx === q.correctOptionIndex ? '!bg-green-100 !border-green-500 !text-green-900' : ''}
                                                        ${submitted && userAnswers[q.id] === oIdx && oIdx !== q.correctOptionIndex ? '!bg-red-100 !border-red-500 !text-red-900' : ''}
                                                    `}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                        {submitted && (
                                            <div className={`mt-3 p-3 rounded text-sm flex gap-2 ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                                {isCorrect ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                                <div>
                                                    <span className="font-bold block mb-1">{isCorrect ? 'Correct!' : 'Incorrect.'}</span>
                                                    <p className="text-xs md:text-sm opacity-90"><span className="font-semibold">Türkçe Açıklama:</span> {q.explanationTR}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                         );
                    })}
                </div>

                <div className="flex justify-end pb-12">
                    {!submitted ? (
                        <button 
                            onClick={() => setSubmitted(true)}
                            disabled={Object.keys(userAnswers).length !== lesson.exercises.length}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            Check Answers
                        </button>
                    ) : (
                        <button 
                            onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); }}
                            className="text-slate-500 hover:text-indigo-600 font-medium"
                        >
                            Scroll to Top
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
