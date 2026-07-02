import { NextRequest, NextResponse } from 'next/server';
import { LanguageCode } from '@/types';
import { transcribeAudio } from '@/lib/server/whisper';
import { scorePronunciation } from '@/lib/server/scoring';

export const runtime = 'nodejs';

/**
 * Evaluación de pronunciación real:
 * 1. Whisper transcribe el audio forzado al idioma objetivo.
 * 2. Se compara la transcripción contra el texto objetivo (similitud
 *    Levenshtein + diff por palabra) → score 0-10 y palabras débiles.
 * Fallback: si no hay audio pero llega `spokenText` (Web Speech API),
 * se evalúa por texto.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    const targetText = formData.get('targetText') as string | null;
    const targetLanguage = formData.get('targetLanguage') as LanguageCode | null;
    const spokenText = formData.get('spokenText') as string | null;

    if (!targetText) {
      return NextResponse.json({ error: 'Missing targetText' }, { status: 400 });
    }

    let heard = spokenText || '';

    if (audio && audio.size > 0) {
      const result = await transcribeAudio(audio, targetLanguage ?? undefined);
      heard = result.text;
    }

    if (!heard) {
      return NextResponse.json(
        { error: 'Missing audio or spokenText' },
        { status: 400 }
      );
    }

    const score = scorePronunciation(targetText, heard);
    return NextResponse.json({ ...score, heardText: heard });
  } catch (error: any) {
    console.error('Pronunciation evaluation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate pronunciation' },
      { status: 500 }
    );
  }
}
