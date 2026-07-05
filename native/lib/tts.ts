import * as Speech from 'expo-speech';
import { getLanguage } from './languages';
import { LanguageCode } from './types';

/**
 * TTS nativo con la voz del sistema (expo-speech): gratis y offline.
 * ElevenLabs queda para una versión futura. Devuelve una promesa que
 * SIEMPRE resuelve (timeout de seguridad de 15s) para no colgar el flujo
 * si onDone nunca dispara.
 */
export function speak(text: string, lang: LanguageCode): Promise<void> {
  return new Promise<void>(resolve => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, 15000);
    try {
      Speech.stop();
      Speech.speak(text, {
        language: getLanguage(lang).locale,
        rate: 0.95,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    } catch {
      finish();
    }
  });
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    /* noop */
  }
}
