import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/server/whisper';

export const runtime = 'nodejs';

const LANG_NAMES: Record<string, string> = {
  it: 'Italian', es: 'Spanish', en: 'English',
  fr: 'French', de: 'German', pt: 'Portuguese',
};

/**
 * Traducción con prioridad:
 * 1. Google Translate (si hay GOOGLE_TRANSLATE_API_KEY)
 * 2. OpenAI gpt-4o-mini (si hay OPENAI_API_KEY)
 * 3. Error claro (sin mocks silenciosos en producción)
 */
export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const GOOGLE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (GOOGLE_KEY) {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
        }
      );
      const data = await response.json();
      const translatedText = data.data?.translations?.[0]?.translatedText;
      if (translatedText) return NextResponse.json({ translatedText });
    }

    if (process.env.OPENAI_API_KEY) {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `You are a translator. Translate the user's text from ${LANG_NAMES[sourceLang] || sourceLang} to ${LANG_NAMES[targetLang] || targetLang}. Reply ONLY with the translation, natural and conversational, no quotes or explanations.`,
          },
          { role: 'user', content: text },
        ],
      });
      const translatedText = completion.choices[0]?.message?.content?.trim();
      if (translatedText) return NextResponse.json({ translatedText });
    }

    return NextResponse.json(
      { error: 'No translation service configured (set OPENAI_API_KEY or GOOGLE_TRANSLATE_API_KEY)' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
