import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const { userMessage, conversationHistory, personality, targetLanguage } = await req.json();
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const personalityPrompts: Record<string, string> = {
      reflective: 'Responde con reflexiones interesantes y profundas que inviten a continuar la conversación. Mantén un tono moderado y sexy.',
      funny: 'Responde con comentarios chistosos y divertidos que inviten a continuar la conversación. Mantén un tono moderado y sexy.',
      tender: 'Responde con comentarios tiernos y cálidos que inviten a continuar la conversación. Mantén un tono moderado y sexy.',
      affectionate: 'Responde con comentarios cariñosos y afectuosos que inviten a continuar la conversación. Mantén un tono moderado y sexy.',
      natural: 'Responde de manera natural y espontánea que inviten a continuar la conversación. Mantén un tono moderado y sexy.',
      executive: 'Responde de manera ejecutiva, directo al grano pero que invite a continuar la conversación. Mantén un tono moderado y sexy.',
    };

    const systemPrompt = `Eres un asistente de conversación bilingüe. Tu rol es ayudar a aprender idiomas de manera natural.
${personalityPrompts[personality] || personalityPrompts.natural}

Debes responder SIEMPRE en el idioma objetivo: ${targetLanguage}.
Responde de manera coherente y contextualizada basándote en el historial de conversación.
Las respuestas deben ser naturales, mantener el hilo de la conversación y ser atractivas.
Mantén un tono moderado y sexy en tus respuestas, invitando siempre a continuar la conversación.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-10).map((msg: string) => ({
        role: 'user' as const,
        content: msg,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any,
      temperature: 0.8,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.';

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Agent response error:', error);
    
    // Fallback response
    const fallbackResponses: Record<string, string> = {
      es: 'Eso es interesante. ¿Puedes contarme más?',
      en: 'That\'s interesting. Can you tell me more?',
      it: 'È interessante. Puoi dirmi di più?',
      fr: 'C\'est intéressant. Pouvez-vous m\'en dire plus?',
      de: 'Das ist interessant. Kannst du mir mehr erzählen?',
      pt: 'Isso é interessante. Você pode me contar mais?',
    };

    return NextResponse.json({ 
      response: fallbackResponses[targetLanguage] || fallbackResponses.en 
    });
  }
}

