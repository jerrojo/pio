import { NextRequest, NextResponse } from 'next/server';
import { LanguageCode } from '@/types';
import { transcribeAudio, getOpenAI } from '@/lib/server/whisper';
import { scorePronunciation } from '@/lib/server/scoring';

const LANG_NAMES: Record<string, string> = {
  it: 'italiano', es: 'español', en: 'inglés',
  fr: 'francés', de: 'alemán', pt: 'portugués',
};

/**
 * Coach de pronunciación: cuando el intento falla, un consejo CONCRETO
 * sobre cómo producir los sonidos que fallaron, en el idioma nativo del
 * alumno. Ejemplo real: "La 'ch' de 'ich' es suave, como soplar una 'j'
 * ligera: 'ij'. Intenta: ij líe-be dij". Fallback: feedback determinista.
 */
async function coachFeedback(
  targetText: string,
  heardText: string,
  targetLanguage: string,
  nativeLanguage: string
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: `Eres un coach de pronunciación experto y cálido. El alumno habla ${LANG_NAMES[nativeLanguage] || nativeLanguage} y aprende ${LANG_NAMES[targetLanguage] || targetLanguage}.
Frase objetivo: "${targetText}"
Lo que se entendió de su intento: "${heardText}"
IMPORTANTE: el consejo debe seguir la fonética del ${LANG_NAMES[targetLanguage] || targetLanguage} (el idioma que aprende), NUNCA las reglas del ${LANG_NAMES[nativeLanguage] || nativeLanguage} (ej.: la 'h' alemana o inglesa SÍ se aspira, aunque en español sea muda).\nResponde SOLO en ${LANG_NAMES[nativeLanguage] || nativeLanguage}, máximo 35 palabras, sin saludos: identifica el sonido que falló y explica CÓMO producirlo con la boca/lengua, incluyendo cómo suena escrito "a la ${LANG_NAMES[nativeLanguage] || nativeLanguage}" (ej. 'ich' → "ij").`,
        },
        { role: 'user', content: 'Dame el consejo.' },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

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
    const nativeLanguage = (formData.get('nativeLanguage') as LanguageCode | null) || 'es';
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

    // Falló: consejo concreto de un coach, no un "inténtalo de nuevo"
    if (!score.passed) {
      const coached = await coachFeedback(
        targetText,
        heard,
        targetLanguage || 'en',
        nativeLanguage
      );
      if (coached) score.feedback = coached;
    }

    return NextResponse.json({ ...score, heardText: heard });
  } catch (error: any) {
    console.error('Pronunciation evaluation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate pronunciation' },
      { status: 500 }
    );
  }
}
