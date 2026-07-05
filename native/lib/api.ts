import { LanguageCode, PronunciationScore } from './types';

/**
 * Cliente de la API de Pío. La app nativa consume el MISMO backend que la
 * web desplegada: Whisper (STT + routing por intención), traducción y
 * evaluación de pronunciación viven en el servidor.
 */

export const BASE = 'https://www.pio.today';

export interface SttResult {
  text: string;
  language?: LanguageCode;
  /** Decisión del servidor: idioma nativo → translate; objetivo → evaluate */
  intent?: 'evaluate' | 'translate';
  reason?: string;
  meta?: string;
  error?: string;
}

/**
 * Sube el audio grabado (m4a de expo-av) y deja que el servidor decida:
 * si hablaste tu idioma → traducir; si hablaste el objetivo → evaluar.
 * `expected` es la frase pendiente de practicar (desambigua el acento).
 */
export async function speechToText(
  audioUri: string,
  target: LanguageCode,
  native: LanguageCode,
  expected?: string
): Promise<SttResult> {
  const formData = new FormData();
  // En React Native un "archivo" en FormData es { uri, name, type }
  formData.append('audio', {
    uri: audioUri,
    name: 'speech.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  formData.append('target', target);
  formData.append('native', native);
  if (expected) formData.append('expected', expected);

  const response = await fetch(`${BASE}/api/speech-to-text`, {
    method: 'POST',
    body: formData,
  });
  return (await response.json()) as SttResult;
}

/** Traducción servidor (Google Translate u OpenAI, decide el backend) */
export async function translateText(
  text: string,
  targetLang: LanguageCode,
  sourceLang: LanguageCode
): Promise<string> {
  try {
    const response = await fetch(`${BASE}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang }),
    });
    const data = await response.json();
    return data.translatedText || text;
  } catch {
    return text;
  }
}

/**
 * Evaluación de pronunciación sobre el texto ya transcrito por Whisper
 * (igual que la web: evita una segunda pasada de audio y responde rápido).
 * Devuelve score 0-10, passed y words[] con calidad por palabra.
 */
export async function evaluatePronunciation(
  targetText: string,
  targetLanguage: LanguageCode,
  spokenText: string,
  nativeLanguage: LanguageCode,
  coachHint?: boolean
): Promise<PronunciationScore> {
  try {
    const formData = new FormData();
    formData.append('spokenText', spokenText);
    formData.append('targetText', targetText);
    formData.append('targetLanguage', targetLanguage);
    formData.append('nativeLanguage', nativeLanguage);
    if (coachHint) formData.append('coach', '1');

    const response = await fetch(`${BASE}/api/evaluate-pronunciation`, {
      method: 'POST',
      body: formData,
    });
    return (await response.json()) as PronunciationScore;
  } catch {
    return {
      score: 6,
      phonemes: [],
      weakPhonemes: [],
      feedback: '',
    };
  }
}
