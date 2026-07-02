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
}

/**
 * Transcribe audio con Whisper. Si se pasa `language`, fuerza ese idioma
 * (útil en modo evaluación); si no, Whisper detecta el idioma hablado.
 */
export async function transcribeAudio(
  audio: File | Blob,
  language?: LanguageCode
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
    temperature: 0,
  });

  const detected = mapWhisperLanguage((transcription as any).language);

  return {
    text: (transcription.text || '').trim(),
    language: language ?? detected,
    raw: (transcription as any).language,
  };
}
