import { NextRequest, NextResponse } from 'next/server';
import { LanguageCode } from '@/types';
import { transcribeAudio, getOpenAI } from '@/lib/server/whisper';

export const runtime = 'nodejs';

const SUPPORTED: LanguageCode[] = ['it', 'es', 'en', 'fr', 'de', 'pt'];

/**
 * Detección de idioma.
 * - multipart/form-data con `audio`: Whisper detecta el idioma hablado (preciso).
 * - JSON con `text`: clasificación con gpt-4o-mini, fallback heurístico.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Vía audio → Whisper
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const audio = formData.get('audio') as File | null;
      if (!audio || audio.size === 0) {
        return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
      }
      const result = await transcribeAudio(audio);
      return NextResponse.json({ language: result.language, text: result.text });
    }

    // Vía texto → LLM con fallback heurístico
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    let language: LanguageCode | null = null;
    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 4,
        messages: [
          {
            role: 'system',
            content:
              'Identify the language of the user text. Reply ONLY with one ISO 639-1 code among: it, es, en, fr, de, pt.',
          },
          { role: 'user', content: text },
        ],
      });
      const code = completion.choices[0]?.message?.content?.trim().toLowerCase() as LanguageCode;
      if (SUPPORTED.includes(code)) language = code;
    } catch {
      // sin API key o error → heurística
    }

    return NextResponse.json({ language: language ?? detectLanguageHeuristic(text) });
  } catch (error: any) {
    console.error('Language detection error:', error);
    return NextResponse.json({ error: 'Failed to detect language' }, { status: 500 });
  }
}

function detectLanguageHeuristic(text: string): LanguageCode {
  const t = ` ${text.toLowerCase()} `;
  const markers: Record<LanguageCode, string[]> = {
    es: [' el ', ' la ', ' que ', ' de ', ' y ', ' hola ', ' gracias ', '¿', 'ñ'],
    en: [' the ', ' and ', ' is ', ' you ', ' hello ', ' thanks ', " i'm ", ' what '],
    it: [' il ', ' che ', ' di ', ' ciao ', ' grazie ', ' sono ', ' perché '],
    fr: [' le ', ' les ', ' je ', ' est ', ' bonjour ', ' merci ', " c'est "],
    de: [' der ', ' die ', ' das ', ' und ', ' ich ', ' hallo ', ' danke '],
    pt: [' o ', ' os ', ' que ', ' obrigado ', ' olá ', ' não ', ' você '],
  };
  let best: LanguageCode = 'es';
  let bestHits = 0;
  (Object.keys(markers) as LanguageCode[]).forEach(code => {
    const hits = markers[code].filter(m => t.includes(m)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = code;
    }
  });
  return best;
}
