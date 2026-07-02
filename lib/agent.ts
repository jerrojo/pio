import { AgentPersonality, LanguageCode } from '@/types';

export async function translateText(text: string, targetLang: LanguageCode, sourceLang: LanguageCode = 'es'): Promise<string> {
  // Using Google Translate API or similar
  // For now, we'll use a mock implementation
  // In production, replace with actual API call
  
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      }),
    });

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

export async function generateAgentResponse(
  userMessage: string,
  conversationHistory: string[],
  personality: AgentPersonality,
  targetLanguage: LanguageCode
): Promise<string> {
  try {
    const response = await fetch('/api/agent-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        conversationHistory,
        personality,
        targetLanguage,
      }),
    });

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Agent response error:', error);
    return 'Lo siento, no pude procesar tu mensaje.';
  }
}

export function detectVoiceGender(): Promise<'male' | 'female'> {
  // This would use voice analysis
  // For now, return a default
  return Promise.resolve('male');
}

export function getPersonalityPrompt(personality: AgentPersonality): string {
  const prompts: Record<AgentPersonality, string> = {
    reflective: 'Responde con reflexiones interesantes y profundas que inviten a continuar la conversación.',
    funny: 'Responde con comentarios chistosos y divertidos que inviten a continuar la conversación.',
    tender: 'Responde con comentarios tiernos y cálidos que inviten a continuar la conversación.',
    affectionate: 'Responde con comentarios cariñosos y afectuosos que inviten a continuar la conversación.',
    natural: 'Responde de manera natural y espontánea que inviten a continuar la conversación.',
    executive: 'Responde de manera ejecutiva, directo al grano pero que invite a continuar la conversación.',
  };
  return prompts[personality];
}


