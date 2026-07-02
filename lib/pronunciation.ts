import { LanguageCode, PronunciationScore } from '@/types';

const REPETITION_THRESHOLD = 7; // ≥ 7/10 to pass

export async function evaluatePronunciation(
  audioBlob: Blob | null,
  targetText: string,
  targetLanguage: LanguageCode,
  spokenText?: string
): Promise<PronunciationScore> {
  try {
    const formData = new FormData();
    if (audioBlob && audioBlob.size > 0) {
      formData.append('audio', audioBlob);
    }
    if (spokenText) {
      formData.append('spokenText', spokenText);
    }
    formData.append('targetText', targetText);
    formData.append('targetLanguage', targetLanguage);

    const response = await fetch('/api/evaluate-pronunciation', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Pronunciation evaluation error:', error);
    return {
      score: 6,
      phonemes: [],
      weakPhonemes: [],
      feedback: 'Error evaluating pronunciation',
    };
  }
}

export function getScoreColor(score: number): string {
  if (score < REPETITION_THRESHOLD) return 'red';
  if (score < 9) return 'yellow';
  return 'green';
}

export function getScoreEmoji(score: number): string {
  if (score < REPETITION_THRESHOLD) return '🔴';
  if (score < 9) return '🟡';
  return '🟢';
}

export function shouldRepeat(score: number): boolean {
  return score < REPETITION_THRESHOLD;
}

export function hasMastered(score: number): boolean {
  return score >= REPETITION_THRESHOLD;
}

export function canChallenge(score: number): boolean {
  return score >= REPETITION_THRESHOLD && score < 9;
}


