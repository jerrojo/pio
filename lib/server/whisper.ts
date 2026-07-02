import OpenAI, { toFile } from 'openai';
import { LanguageCode } from '@/types';

/**
 * Integración con Whisper (https://github.com/openai/whisper) vía OpenAI API.
 * Modelo: whisper-1 (large-v2 hosteado). Transcripción y detección de idioma
 * en una sola llamada con response_format: 'verbose_json'.
 */

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada en .env.local');
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

/** Whisper devuelve nombres completos en inglés → códigos de la app */
const WHISPER_LANG_MAP: Record<string, LanguageCode> = {
  italian: 'it',
  spanish: 'es',
  english: 'en',
  french: 'fr',
  german: 'de',
  portuguese: 'pt',
  it: 'it', es: 'es', en: 'en', fr: 'fr', de: 'de', pt: 'pt',
};

export function mapWhisperLanguage(lang?: string): LanguageCode | null {
  if (!lang) return null;
  return WHISPER_LANG_MAP[lang.toLowerCase().trim()] ?? null;
}

export interface WhisperResult {
  text: string;
  language: LanguageCode | null;
  raw?: string;
  /** Probabilidad media de que el audio NO sea voz (0-1) */
  noSpeechProb: number;
  /** Log-probabilidad media de la transcripción (más negativa = menos confiable) */
  avgLogprob: number;
}

/**
 * Compuerta de calidad: descarta ruido, música y voces de fondo lejanas.
 * Whisper alucina texto plausible sobre audio dudoso; sus propias métricas
 * por segmento son la mejor defensa.
 */
export function isReliable(r: WhisperResult): boolean {
  if (!r.text) return false;
  if (r.noSpeechProb > 0.55) return false;
  if (r.avgLogprob < -1.1) return false;
  return true;
}

/**
 * Transcribe audio con Whisper. Si se pasa `language`, fuerza ese idioma
 * (útil en modo evaluación); si no, Whisper detecta el idioma hablado.
 */
export async function transcribeAudio(
  audio: File | Blob,
  language?: LanguageCode,
  prompt?: string
): Promise<WhisperResult> {
  const openai = getOpenAI();

  const buffer = Buffer.from(await audio.arrayBuffer());

  // Whisper decide el formato por la extensión del nombre de archivo.
  // Los Blobs del navegador llegan como "blob" sin extensión, así que la
  // derivamos del content-type real (iOS graba audio/mp4, Chrome webm).
  const type = (audio.type || '').toLowerCase();
  const ext = type.includes('mp4') || type.includes('m4a')
    ? 'mp4'
    : type.includes('ogg')
    ? 'ogg'
    : type.includes('mpeg') || type.includes('mp3')
    ? 'mp3'
    : type.includes('wav')
    ? 'wav'
    : 'webm';
  const givenName = audio instanceof File ? audio.name : '';
  const hasValidExt = /\.(webm|mp4|m4a|ogg|mp3|wav|flac|mpga|mpeg|oga)$/i.test(givenName);
  const filename = hasValidExt ? givenName : `audio.${ext}`;

  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(buffer, filename),
    model: 'whisper-1',
    response_format: 'verbose_json',
    ...(language ? { language } : {}),
    ...(prompt ? { prompt } : {}),
    temperature: 0,
  });

  const detected = mapWhisperLanguage((transcription as any).language);

  // Métricas de confianza promediadas sobre los segmentos
  const segments: any[] = (transcription as any).segments || [];
  let noSpeechProb = 0;
  let avgLogprob = 0;
  if (segments.length > 0) {
    noSpeechProb =
      segments.reduce((s, seg) => s + (seg.no_speech_prob ?? 0), 0) / segments.length;
    avgLogprob =
      segments.reduce((s, seg) => s + (seg.avg_logprob ?? 0), 0) / segments.length;
  }

  return {
    text: (transcription.text || '').trim(),
    language: language ?? detected,
    raw: (transcription as any).language,
    noSpeechProb,
    avgLogprob,
  };
}
