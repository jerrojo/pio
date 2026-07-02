import { LanguageCode } from '@/types';

export async function translateText(
  text: string,
  targetLang: LanguageCode,
  sourceLang: LanguageCode = 'es'
): Promise<string> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang }),
    });

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
