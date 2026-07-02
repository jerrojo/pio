import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Caché en memoria por instancia: en el loop de práctica la misma frase
// se sintetiza una y otra vez. LRU simple, ~60 audios (~2-3 MB).
const ttsCache = new Map<string, Uint8Array>();
const TTS_CACHE_MAX = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, model = 'eleven_multilingual_v2' } = await req.json();

    if (!text || !voiceId) {
      return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
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

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    const audio = new Uint8Array(response.data);
    ttsCache.set(cacheKey, audio);
    if (ttsCache.size > TTS_CACHE_MAX) {
      ttsCache.delete(ttsCache.keys().next().value!);
    }

    return new NextResponse(Buffer.from(audio), {
      headers: { 'Content-Type': 'audio/mpeg', 'X-Cache': 'MISS' },
    });
  } catch (error: any) {
    console.error('ElevenLabs TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}


