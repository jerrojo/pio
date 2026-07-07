import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Caché en memoria por instancia: en el loop de práctica la misma frase
// se sintetiza una y otra vez. LRU simple, ~60 audios (~2-3 MB).
const ttsCache = new Map<string, Uint8Array>();
const TTS_CACHE_MAX = 60;

// Cortacircuito: si ElevenLabs falla (p. ej. cuota agotada), no volvemos a
// intentarlo por un rato para no sumar latencia a cada frase.
let elevenDownUntil = 0;
const ELEVEN_COOLDOWN_MS = 10 * 60_000;

function cachePut(key: string, audio: Uint8Array) {
  ttsCache.set(key, audio);
  if (ttsCache.size > TTS_CACHE_MAX) {
    ttsCache.delete(ttsCache.keys().next().value!);
  }
}

async function elevenLabsTts(text: string, voiceId: string, model: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ElevenLabs no configurado');
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    },
    {
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 8000,
    }
  );
  return new Uint8Array(response.data);
}

async function openaiTts(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI no configurado');
  const response = await axios.post(
    'https://api.openai.com/v1/audio/speech',
    { model: 'tts-1', voice: 'nova', input: text, response_format: 'mp3' },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 15000,
    }
  );
  return new Uint8Array(response.data);
}

/**
 * TTS con cadena de respaldo: ElevenLabs (voces premium por idioma) →
 * OpenAI tts-1 (multilingüe, confiable, con crédito). El cliente conserva
 * su propio respaldo final (voz del sistema), pero con esta cadena el
 * servidor prácticamente siempre devuelve audio.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, model = 'eleven_multilingual_v2' } = await req.json();

    if (!text || !voiceId) {
      return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 });
    }

    const cacheKey = `${voiceId}:${model}:${text}`;
    const hit = ttsCache.get(cacheKey);
    if (hit) {
      // refresca posición LRU
      ttsCache.delete(cacheKey);
      ttsCache.set(cacheKey, hit);
      return new NextResponse(Buffer.from(hit), {
        headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'HIT' },
      });
    }

    let audio: Uint8Array | null = null;
    let provider = 'elevenlabs';

    if (Date.now() >= elevenDownUntil) {
      try {
        audio = await elevenLabsTts(text, voiceId, model);
      } catch {
        elevenDownUntil = Date.now() + ELEVEN_COOLDOWN_MS;
      }
    }

    if (!audio) {
      provider = 'openai';
      audio = await openaiTts(text);
    }

    cachePut(cacheKey, audio);
    return new NextResponse(Buffer.from(audio), {
      headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'MISS', 'X-Provider': provider },
    });
  } catch (error: any) {
    console.error('TTS error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
