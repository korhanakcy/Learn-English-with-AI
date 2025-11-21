import { Type } from "@google/genai";

export enum AppMode {
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  GRAMMAR = 'GRAMMAR'
}

export enum ListeningType {
  ARTICLE = 'ARTICLE',
  AUDIO = 'AUDIO'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SpeakingFeedback {
  original: string;
  corrected: string;
  turkishExplanation: string;
  improvedVersion: string;
  advancedVersion: string;
  score: number;
}

export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanationTR: string;
}

export interface ListeningExercise {
  content: string; // Text of article or script of audio
  questions: Question[];
}

export interface GrammarLesson {
  topic: string;
  explanation: string;
  examples: string[];
  exercises: Question[];
}

// API Response Schemas (Helpers for Schema Definition)

export const QuestionSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.INTEGER },
    questionText: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctOptionIndex: { type: Type.INTEGER },
    explanationTR: { type: Type.STRING },
  },
  required: ["id", "questionText", "options", "correctOptionIndex", "explanationTR"]
};

export const ListeningResponseSchema = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.STRING },
    questions: { type: Type.ARRAY, items: QuestionSchema },
  },
  required: ["content", "questions"]
};

export const GrammarResponseSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    explanation: { type: Type.STRING },
    examples: { type: Type.ARRAY, items: { type: Type.STRING } },
    exercises: { type: Type.ARRAY, items: QuestionSchema },
  },
  required: ["topic", "explanation", "examples", "exercises"]
};