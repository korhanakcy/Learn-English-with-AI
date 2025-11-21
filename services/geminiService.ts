import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ListeningExercise, GrammarLesson, ListeningResponseSchema, GrammarResponseSchema, ChatMessage } from "../types";

// Initialize API Client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const MODEL_TEXT = 'gemini-2.5-flash';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_AUDIO_INPUT = 'gemini-2.5-flash'; 

// Strict Tutor Persona Instruction
const SYSTEM_INSTRUCTION_STRICT_TUTOR = `
You are a strict but friendly English tutor in a real-time voice conversation.
Your goal is to help the user improve their Speaking skills via voice interaction.

BEHAVIOR:
1. Act as a conversation partner. Speak naturally.
2. STRICTLY correct every single mistake visually in the text block.
3. Your audio output (TTS) will ONLY read the conversational parts ("Voice Response" and "New Voice Question").
4. Keep the spoken parts short, natural, and easy to listen to.

RESPONSE FORMAT (Strictly follow this structure for every reply):

🗣️ User Transcription:
[Transcribe exactly what the user said. If it was text input, just repeat it. If audio, transcribe it to English.]

🎙️ Voice Response:
[A short, natural, spoken response to what the user said. Keep it conversational. This will be spoken aloud.]

✔ Corrected Sentence:
[The user's exact sentence corrected perfectly. If perfect, write "Perfect!"]

🇹🇷 Explanation:
[Explain mistakes in Turkish. Short and clear. This is text-only.]

✨ More Natural Version:
[How a native speaker would phrase this. This is text-only.]

❓ New Voice Question:
[A relevant, simple follow-up question to keep the chat going. This will be spoken aloud.]

If the user greets you, just provide the Voice Response and New Voice Question, skip corrections if not applicable.
`;

// Helper to write string to DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Helper to add WAV header to raw PCM data
function addWavHeader(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): ArrayBuffer {
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);

  return buffer;
}

export const GeminiService = {
  /**
   * Starts a speaking session with an initial prompt.
   */
  async startSpeakingSession(topic: string, level: string): Promise<string> {
    try {
      const prompt = `
      You are an English tutor (Target Level: ${level}) starting a conversation about: "${topic}".
      
      OUTPUT FORMAT:
      🎙️ Voice Response:
      [Friendly greeting and a simple opening question about the topic suitable for level ${level}.]
      
      (Do not include corrections yet, just the opening voice response.)
      `;
      
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });
      return response.text || `🎙️ Voice Response:\nLet's talk about ${topic}. How are you feeling about this topic?`;
    } catch (e) {
      console.error("Error starting conversation:", e);
      return `🎙️ Voice Response:\nLet's talk about ${topic}. What are your thoughts?`;
    }
  },

  /**
   * Analyzes speaking input (text or audio) and provides strict feedback within a conversation.
   */
  async analyzeSpeaking(
    input: string | { data: string, mimeType: string }, 
    topic: string, 
    level: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Filter history to ensure we don't send too much context, 
      // but enough to maintain conversation flow.
      const recentHistory = history.slice(-6).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const isAudio = typeof input !== 'string';
      
      // We explicitly tell the model the topic again to ensure focus
      const contextPrompt = `Topic: ${topic}. Student Level: ${level}. Analyze the User Input below.`;

      const currentParts = isAudio 
        ? [{ text: contextPrompt }, { inlineData: input }]
        : [{ text: `${contextPrompt}\nUser Input: ${input}` }];

      const contents = [
        ...recentHistory,
        { role: 'user', parts: currentParts }
      ];

      const response = await ai.models.generateContent({
        model: MODEL_AUDIO_INPUT,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_STRICT_TUTOR,
          temperature: 0.4, // Balanced for creativity in chat but strict in correction
        }
      });

      return response.text || "🎙️ Voice Response:\nI couldn't process that. Could you say it again?";
    } catch (error) {
      console.error("Speaking analysis error:", error);
      return "🎙️ Voice Response:\nConnection error. Please try again.";
    }
  },

  /**
   * Generates a listening exercise (Article or Audio script).
   */
  async generateListeningExercise(type: 'ARTICLE' | 'AUDIO', level: string): Promise<ListeningExercise> {
    try {
      const isAudio = type === 'AUDIO';
      const prompt = isAudio 
        ? `Generate a short spoken script (approx 100 words) for a ${level} English learner about a random interesting topic. Then create 3 multiple choice questions.`
        : `Generate a short reading article (approx 150 words) for a ${level} English learner. Then create 3 multiple choice questions.`;

      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          systemInstruction: "You are an English exam creator. Output strictly valid JSON.",
          responseMimeType: "application/json",
          responseSchema: ListeningResponseSchema as Schema,
        }
      });
      
      if (response.text) {
         return JSON.parse(response.text) as ListeningExercise;
      }
      throw new Error("No data returned");
    } catch (error) {
      console.error("Listening generation error:", error);
      throw error;
    }
  },

  /**
   * Generates audio from text (TTS).
   * Returns a WAV formatted ArrayBuffer suitable for browser playback.
   */
  async generateSpeech(text: string): Promise<ArrayBuffer> {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_TTS,
        contents: { parts: [{ text }] },
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data returned");

      // Decode Base64 to Uint8Array (Raw PCM)
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const pcmBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        pcmBytes[i] = binaryString.charCodeAt(i);
      }

      // Convert Raw PCM to WAV by adding a RIFF header
      // Gemini TTS typically returns 24kHz mono 16-bit PCM
      return addWavHeader(pcmBytes, 24000, 1);
    } catch (error) {
      console.error("TTS error:", error);
      throw error;
    }
  },

  /**
   * Generates a grammar lesson.
   */
  async generateGrammarLesson(level: string, topic?: string): Promise<GrammarLesson> {
    try {
      const prompt = topic 
        ? `Create a grammar lesson for ${level} level students about "${topic}". Include explanation, examples, and 5 exercises.`
        : `Pick a random important grammar topic for ${level} level students. Create a lesson with explanation, examples, and 5 exercises.`;

      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          systemInstruction: "You are a strict grammar teacher. Output strictly valid JSON.",
          responseMimeType: "application/json",
          responseSchema: GrammarResponseSchema as Schema,
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as GrammarLesson;
      }
      throw new Error("No data returned");
    } catch (error) {
      console.error("Grammar generation error:", error);
      throw error;
    }
  }
};