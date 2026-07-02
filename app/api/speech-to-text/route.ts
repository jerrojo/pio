import { NextRequest, NextResponse } from 'next/server';
import { LanguageCode } from '@/types';
import { transcribeAudio } from '@/lib/server/whisper';

export const runtime = 'nodejs';

/**
 * Speech-to-Text con Whisper (whisper-1).
 * Devuelve texto + idioma detectado en una sola llamada.
 * Si se envía `language`, fuerza la transcripción en ese idioma.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    const language = (formData.get('language') as LanguageCode | null) || undefined;
    const prompt = (formData.get('prompt') as string | null) || undefined;

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const result = await transcribeAudio(audio, language, prompt);

    return NextResponse.json({
      text: result.text,
      language: result.language,
    });
  } catch (error: any) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process audio' },
      { status: 500 }
    );
  }
}
