import { PronunciationScore } from '@/types';

/**
 * Scoring de pronunciación basado en la transcripción de Whisper:
 * compara lo que Whisper entendió contra el texto objetivo.
 * Si Whisper (forzado al idioma objetivo) transcribe correctamente,
 * la pronunciación fue lo bastante clara para ser entendida.
 */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // sin diacríticos: no penaliza tildes
    .replace(/[^\p{L}\p{N}\s]/gu, '') // sin puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Palabras del objetivo que no se reconocieron bien */
function findWeakWords(target: string, heard: string): string[] {
  const targetWords = target.split(' ');
  const heardWords = new Set(heard.split(' '));
  return targetWords.filter(w => {
    if (heardWords.has(w)) return false;
    // tolera pequeñas variaciones por palabra
    return ![...heardWords].some(h => similarity(w, h) >= 0.75);
  });
}

function buildFeedback(score: number, weakWords: string[]): string {
  if (score >= 9) return '¡Excelente pronunciación! Se entendió perfectamente.';
  if (score >= 7) {
    return weakWords.length
      ? `¡Bien hecho! Presta atención a: ${weakWords.slice(0, 3).join(', ')}.`
      : '¡Bien hecho! Continúa practicando para pulir los detalles.';
  }
  if (weakWords.length) {
    return `Repite con calma. No se entendieron bien: ${weakWords.slice(0, 3).join(', ')}. Pronuncia cada sílaba.`;
  }
  return 'Intenta pronunciar más claramente y un poco más despacio.';
}

export function scorePronunciation(targetText: string, heardText: string): PronunciationScore {
  const target = normalize(targetText);
  const heard = normalize(heardText);

  if (!heard) {
    return {
      score: 0,
      phonemes: [],
      weakPhonemes: [],
      feedback: 'No se detectó voz. Acércate al micrófono e inténtalo de nuevo.',
    };
  }

  const sim = similarity(target, heard);
  const weakWords = findWeakWords(target, heard);

  // curva: similitud 1.0 → 10, 0.85 → ~8.5, 0.6 → ~5
  const score = Math.max(0, Math.min(10, Math.round(sim * 10)));

  return {
    score,
    phonemes: [],
    weakPhonemes: weakWords,
    feedback: buildFeedback(score, weakWords),
  };
}
