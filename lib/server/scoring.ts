import { PronunciationScore, WordFeedback } from '@/types';
import { stripFillers } from '@/lib/server/cleanTranscript';

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
/**
 * Alineamiento en orden palabra-a-palabra (feedback visual estilo ELSA):
 * para cada palabra del objetivo busca su mejor match en una ventana de
 * lo escuchado → 'good' (≥0.85), 'weak' (≥0.6) o 'bad'.
 */
function alignWords(targetText: string, heard: string): WordFeedback[] {
  const originals = targetText.split(/\s+/).filter(Boolean);
  const heardWords = heard.split(' ').filter(Boolean);
  let hIdx = 0;

  return originals.map(original => {
    const tw = normalize(original);
    if (!tw) return { word: original, quality: 'good' as const };

    let best = 0;
    let bestJ = -1;
    for (let j = hIdx; j < Math.min(heardWords.length, hIdx + 3); j++) {
      const s = similarity(tw, heardWords[j]);
      if (s > best) {
        best = s;
        bestJ = j;
      }
    }
    if (bestJ >= 0 && best >= 0.6) hIdx = bestJ + 1;

    const quality: WordFeedback['quality'] =
      best >= 0.85 ? 'good' : best >= 0.6 ? 'weak' : 'bad';
    return { word: original, quality };
  });
}

function buildFeedback(score: number, passed: boolean, badWords: string[]): string {
  if (passed && score >= 9) return '¡Excelente pronunciación! Se entendió perfectamente.';
  if (passed) return '¡Bien hecho! Se entendió claramente.';
  if (badWords.length) {
    return `Casi. La palabra clave es "${badWords[0]}" — escúchala tocándola y repite la frase.`;
  }
  return 'Intenta pronunciar más claramente y un poco más despacio.';
}

export function scorePronunciation(targetText: string, heardText: string): PronunciationScore {
  const target = normalize(targetText);
  // Un "mmm" o "este..." a mitad del intento no cuenta contra el score
  const heard = normalize(stripFillers(heardText));

  if (!heard) {
    return {
      score: 0,
      phonemes: [],
      weakPhonemes: [],
      feedback: 'No se detectó voz. Acércate al micrófono e inténtalo de nuevo.',
    };
  }

  const sim = similarity(target, heard);
  const words = alignWords(targetText, heard);
  const weakWords = words.filter(w => w.quality !== 'good').map(w => normalize(w.word));
  const badWords = words.filter(w => w.quality === 'bad').map(w => w.word);

  // curva: similitud 1.0 → 10, 0.85 → ~8.5, 0.6 → ~5
  const score = Math.max(0, Math.min(10, Math.round(sim * 10)));

  // Estricto total: la frase pasa solo cuando TODAS las palabras están
  // en verde (el flujo rojas→amarillas→frase se repite hasta lograrlo)
  const passed = score >= 7 && words.every(w => w.quality === 'good');

  return {
    score,
    phonemes: [],
    weakPhonemes: weakWords,
    feedback: buildFeedback(score, passed, badWords),
    words,
    passed,
  };
}
