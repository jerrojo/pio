import { NextRequest, NextResponse } from 'next/server';
import { LanguageCode } from '@/types';
import { transcribeAudio } from '@/lib/server/whisper';
import { normalize, similarity } from '@/lib/server/scoring';

export const runtime = 'nodejs';

/**
 * Speech-to-Text con Whisper + routing por idioma.
 *
 * Regla de la app: hablas tu idioma natal → traducir; hablas el idioma
 * que aprendes → evaluar pronunciación. La detección de Whisper falla con
 * acento extranjero en frases cortas (inglés de hispanohablante suena a
 * "español"), así que cuando la detección dice "no es el objetivo" PERO
 * hay una frase esperada (`expected`), hacemos una segunda pasada forzada
 * al idioma objetivo y comparamos: si el audio se parece a la frase
 * esperada, era un intento de pronunciación; si no, era una frase nueva
 * para traducir. La regla del usuario se respeta siempre.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    const language = (formData.get('language') as LanguageCode | null) || undefined;
    const prompt = (formData.get('prompt') as string | null) || undefined;
    const target = (formData.get('target') as LanguageCode | null) || undefined;
    const expected = (formData.get('expected') as string | null) || undefined;

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Pasada 1: detección libre
    const free = await transcribeAudio(audio, language, prompt);

    // Detectó el idioma objetivo directamente → evaluar
    if (target && free.language === target) {
      return NextResponse.json({ text: free.text, language: free.language, intent: 'evaluate' });
    }

    // Ambigüedad: no detectó el objetivo, pero hay frase pendiente.
    // Pasada 2 forzada al objetivo para ver si el audio ERA el intento.
    if (target && expected) {
      const forced = await transcribeAudio(audio, target, expected);
      const sim = similarity(normalize(forced.text), normalize(expected));
      if (sim >= 0.45) {
        return NextResponse.json({ text: forced.text, language: target, intent: 'evaluate' });
      }
    }

    return NextResponse.json({ text: free.text, language: free.language, intent: 'translate' });
  } catch (error: any) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process audio' },
      { status: 500 }
    );
  }
}
