export type LanguageCode = 'it' | 'es' | 'en' | 'fr' | 'de' | 'pt';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  accent: string;
  voiceName: string;
  locale: string;
  elevenLabsVoiceId?: string;
}

export interface Message {
  id: string;
  text: string;
  translatedText?: string;
  language: LanguageCode;
  translatedLanguage?: LanguageCode;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  agentGender: 'male' | 'female';
  createdAt: Date;
  updatedAt: Date;
}

export type AgentPersonality = 
  | 'reflective' 
  | 'funny' 
  | 'tender' 
  | 'affectionate' 
  | 'natural' 
  | 'executive';

export type ConversationMode = 'translation' | 'evaluation' | 'detection';

export interface PronunciationScore {
  score: number; // 0-10
  phonemes: PhonemeScore[];
  weakPhonemes: string[];
  feedback: string;
  /** Feedback visual palabra por palabra (estilo ELSA) */
  words?: WordFeedback[];
}

export interface WordFeedback {
  word: string; // palabra original del texto objetivo
  quality: 'good' | 'weak' | 'bad';
}

export interface PhonemeScore {
  phoneme: string;
  accuracy: number; // 0-10
  position: number;
}

export interface UserProgress {
  userId: string;
  targetLanguage: LanguageCode;
  totalInteractions: number;
  clarityScore: number;
  weakPhonemes: string[];
  lastUpdated: Date;
}

export interface AppState {
  isAuthenticated: boolean;
  hasAcceptedTerms: boolean;
  faceIdAttempts: number;
  isLockedOut: boolean;
  currentMode: ConversationMode;
  pronunciationScore?: PronunciationScore;
  interactionCount: number;
}

