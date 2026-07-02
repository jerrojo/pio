import { NextRequest, NextResponse } from 'next/server';
import { LanguageCode } from '@/types';
import { transcribeAudio } from '@/lib/server/whisper';
import { normalize, similarity } from '@/lib/server/scoring';
import { cleanUtterance, stripFillers } from '@/lib/server/cleanTranscript';
import { isReliable } from '@/lib/server/whisper';

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
    const native = (formData.get('native') as LanguageCode | null) || undefined;
    const expected = (formData.get('expected') as string | null) || undefined;

    if (!audio || audio.size === 0) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Pasada 1: detección libre
    const free = await transcribeAudio(audio, language, prompt);

    // Compuerta de calidad: ruido, música o voces de fondo no cuentan
    if (!isReliable(free)) {
      return NextResponse.json({ text: '', reason: 'unreliable' });
    }

    // Limpieza de habla espontánea: muletillas fuera, y si es una
    // meta-pregunta ("cómo se dice X"), el contenido real es X
    const cleaned = cleanUtterance(free.text);
    if (!cleaned.text) {
      return NextResponse.json({ text: '', reason: 'only-fillers' });
    }

    // "Cómo se dice X" siempre es petición de traducción, sin importar
    // el idioma detectado
    if (cleaned.wasMeta) {
      return NextResponse.json({
        text: cleaned.text,
        language: free.language,
        intent: 'translate',
        meta: 'how-to-say',
      });
    }

    // Detectó el idioma objetivo directamente → evaluar
    if (target && free.language === target) {
      return NextResponse.json({ text: cleaned.text, language: free.language, intent: 'evaluate' });
    }

    // Hay frase pendiente de practicar: decidir si esto ERA el intento.
    // Principio: SOLO el idioma nativo dispara traducción. El acento hace
    // que Whisper etiquete el intento como un tercer idioma (alemán de
    // hispanohablante suena a "inglés") — eso NUNCA debe traducirse.
    if (target && expected) {
      const forced = await transcribeAudio(audio, target, expected);
      const forcedClean = stripFillers(forced.text);
      const sim = similarity(normalize(forcedClean), normalize(expected));

      // Se parece a la frase esperada → intento claro
      if (sim >= 0.45) {
        return NextResponse.json({ text: forcedClean, language: target, intent: 'evaluate' });
      }

      // Suena a un TERCER idioma (ni objetivo ni nativo) → intento con
      // acento fuerte: evaluar contra lo esperado (score bajo + coaching),
      // jamás traducir el malentendido
      if (free.language !== native) {
        return NextResponse.json({
          text: forcedClean || cleaned.text,
          language: target,
          intent: 'evaluate',
        });
      }

      // Suena al nativo pero con parecido moderado → probablemente el
      // intento (frases cortas engañan a la detección)
      if (sim >= 0.28) {
        return NextResponse.json({ text: forcedClean, language: target, intent: 'evaluate' });
      }
    }

    return NextResponse.json({ text: cleaned.text, language: free.language, intent: 'translate' });
  } catch (error: any) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process audio' },
      { status: 500 }
    );
  }
}
