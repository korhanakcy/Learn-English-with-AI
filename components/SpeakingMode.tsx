import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Volume2, Loader2, User, Bot, PlayCircle } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

export const SpeakingMode: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B1');
  const [isTopicSet, setIsTopicSet] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'audio'>('audio');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  // Chat History State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  const playResponseAudio = async (text: string) => {
    // Stop any currently playing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    // Parse the response to find parts to speak: "Voice Response" and "New Voice Question"
    const voiceResponseMatch = text.match(/🎙️ Voice Response:\s*([\s\S]*?)(?=\n✔|\n🇹🇷|\n✨|\n❓|$)/i);
    const questionMatch = text.match(/❓ New Voice Question:\s*([\s\S]*?)$/i);

    let textToSpeak = "";
    
    if (voiceResponseMatch) {
        textToSpeak += voiceResponseMatch[1].trim() + " ";
    }
    // Add a slight pause naturally by just appending text, TTS handles punctuation
    if (questionMatch) {
        textToSpeak += questionMatch[1].trim();
    }

    // Fallback: If tags are missing (e.g. error message or simple greeting without tags), try to speak the whole text
    if (!textToSpeak.trim()) {
        // Don't speak if it's just the transcription
        if (!text.includes("🎙️ Voice Response:")) {
             // check if it looks like a standard response structure but missing tags
             textToSpeak = text; 
        }
    }
    
    // Clean up markdown bolding if present in the spoken text
    textToSpeak = textToSpeak.replace(/\*\*/g, '').replace(/__/g, '');

    if (!textToSpeak.trim()) return;

    setIsPlayingAudio(true);
    try {
      const audioBuffer = await GeminiService.generateSpeech(textToSpeak);
      // Create a Blob from the WAV buffer
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      activeAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(url);
      };
      
      await audio.play();
    } catch (e) {
      console.error("TTS error", e);
      setIsPlayingAudio(false);
    }
  };

  const startConversation = async () => {
    if (topic.trim()) {
      setIsTopicSet(true);
      setIsProcessing(true);
      // Get initial greeting/question
      const initialResponse = await GeminiService.startSpeakingSession(topic, level);
      setMessages([{ role: 'model', text: initialResponse }]);
      setIsProcessing(false);
      
      // Auto-play the greeting
      playResponseAudio(initialResponse);
    }
  };

  const startRecording = async () => {
    // Stop any playing audio when user starts recording
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setIsPlayingAudio(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          // Show "..." initially while we wait for transcription
          await submitResponse({ data: base64String, mimeType: 'audio/webm' }, "🎤 ..."); 
        };
      };
    }
  };

  const submitResponse = async (data: string | { data: string, mimeType: string }, displayText?: string) => {
    if (isProcessing) return;

    // Stop audio if playing
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setIsPlayingAudio(false);
    }

    const userMsgText = typeof data === 'string' ? data : (displayText || "Audio Message");
    
    // 1. Add User Message
    const newUserMsg: ChatMessage = { role: 'user', text: userMsgText };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    
    setIsProcessing(true);
    setInputText('');

    // 2. Get AI Analysis & Response
    // We need to pass the messages as context, but for the very last message (this one), 
    // if it's audio, the logic in analyzeSpeaking handles it.
    const aiResponseText = await GeminiService.analyzeSpeaking(data, topic, level, updatedMessages); 

    // 3. Parse Transcription from Response
    // Format: "🗣️ User Transcription:\n[Text]\n\n🎙️ Voice Response:..."
    let finalModelText = aiResponseText;
    let transcribedText = "";

    const transcriptionMatch = aiResponseText.match(/🗣️ User Transcription:\s*([\s\S]*?)(?=\n🎙️|\n✔|$)/i);
    if (transcriptionMatch) {
        transcribedText = transcriptionMatch[1].trim();
        // Remove the transcription part from the model's displayed text to keep it clean
        // We only want the feedback parts in the model bubble.
        // However, strictly speaking, the prompt says the format follows immediately.
        // We can leave it or strip it. Let's strip it to avoid duplication.
        // finalModelText = aiResponseText.replace(transcriptionMatch[0], "").trim(); 
        // Actually, the prompt says "RESPONSE FORMAT...". 
        // Let's just extract it and update the USER bubble.
    }

    // 4. Update User Message with Transcription if it was audio
    if (typeof data !== 'string' && transcribedText) {
        setMessages(prev => {
            const newHistory = [...prev];
            // Replace the last user message (which was "🎤 ...") with the transcription
            const lastIdx = newHistory.length - 1; // This is the last added
            // Ensure it is user role before replacing
            if (lastIdx >= 0 && newHistory[lastIdx].role === 'user') {
                newHistory[lastIdx] = { ...newHistory[lastIdx], text: transcribedText };
            }
            // Add model response
            return [...newHistory, { role: 'model', text: finalModelText }];
        });
    } else {
         // Just add model response
         setMessages(prev => [...prev, { role: 'model', text: finalModelText }]);
    }

    setIsProcessing(false);

    // 5. Play Audio automatically
    playResponseAudio(finalModelText);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      submitResponse(inputText);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
            <div className="flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-indigo-600" />
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">Speaking Coach</h2>
                    {isTopicSet && <span className="text-xs text-slate-400">{level} Level</span>}
                </div>
            </div>
            {isTopicSet && (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 hidden sm:inline bg-slate-100 px-3 py-1 rounded-full">
                        Topic: <span className="font-semibold text-slate-900">{topic}</span>
                    </span>
                    <button onClick={() => { setIsTopicSet(false); setMessages([]); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        End Session
                    </button>
                </div>
            )}
        </div>

        {!isTopicSet ? (
          <div className="flex-1 flex flex-col justify-center p-8 space-y-6 max-w-lg mx-auto w-full">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Live Voice Conversation</h3>
                <p className="text-slate-500">I will speak with you and correct you instantly. Pick a level & topic:</p>
            </div>
            
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Your Level</label>
                    <select 
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    >
                        {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Job Interview, Travel, Movies..."
                  className="flex-1 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && startConversation()}
                />
                <button
                  onClick={startConversation}
                  disabled={!topic.trim()}
                  className="px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                >
                  Start
                </button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                  {['Job Interview', 'My Hobbies', 'Future Plans', 'Favorite Movie', 'Ordering Food'].map(t => (
                      <button key={t} onClick={() => setTopic(t)} className="text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-full transition-colors">
                          {t}
                      </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
                {messages.length === 0 && isProcessing && (
                    <div className="flex justify-center pt-10">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400"/>
                    </div>
                )}
                
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot className="w-5 h-5 text-indigo-600" />
                            </div>
                        )}
                        
                        <div className={`
                            relative max-w-[90%] md:max-w-[80%] p-4 rounded-2xl shadow-sm
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }
                        `}>
                            {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            ) : (
                                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                                    <ReactMarkdown
                                        components={{
                                            strong: ({node, ...props}) => <span className="font-bold text-indigo-700 block mt-2 mb-1" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                                        }}
                                    >
                                        {/* Hide the transcription part from the AI bubble if displayed there */}
                                        {msg.text.replace(/🗣️ User Transcription:[\s\S]*?(?=\n🎙️|\n✔|$)/, '')}
                                    </ReactMarkdown>

                                    {/* Re-play button for this specific message */}
                                    <button 
                                        onClick={() => playResponseAudio(msg.text)}
                                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-indigo-600 transition-colors bg-white/80 rounded-full"
                                        title="Listen again"
                                    >
                                        <PlayCircle className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                                <User className="w-5 h-5 text-slate-500" />
                            </div>
                        )}
                    </div>
                ))}

                {isProcessing && messages.length > 0 && (
                    <div className="flex justify-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                             <Bot className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="max-w-3xl mx-auto flex flex-col gap-4">
                    
                    {/* Input Mode Toggle */}
                    <div className="flex justify-center">
                         <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                             <button 
                                onClick={() => setInputMode('audio')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${inputMode === 'audio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                Audio
                             </button>
                             <button 
                                onClick={() => setInputMode('text')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${inputMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                Text
                             </button>
                         </div>
                    </div>

                    {inputMode === 'audio' ? (
                        <div className="flex flex-col items-center pb-2">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isProcessing}
                                className={`
                                relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                                ${isRecording ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-100' : 'bg-indigo-600 hover:bg-indigo-700 ring-4 ring-indigo-100'}
                                `}
                            >
                                {isRecording ? <Square className="w-6 h-6 text-white fill-current" /> : <Mic className="w-8 h-8 text-white" />}
                                {isRecording && (
                                    <span className="absolute -top-8 text-red-500 text-xs font-bold animate-pulse">Recording...</span>
                                )}
                            </button>
                            <p className="text-xs text-slate-400 mt-2">
                                {isPlayingAudio ? "Listening to Tutor..." : isRecording ? "Listening to you..." : "Tap to speak"}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleTextSubmit} className="flex gap-2">
                            <input 
                                type="text"
                                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 placeholder:text-slate-400"
                                placeholder="Type your response..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={isProcessing}
                            />
                            <button 
                                type="submit" 
                                disabled={!inputText.trim() || isProcessing} 
                                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    )}
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};