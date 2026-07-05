import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Progreso local (AsyncStorage): frases dominadas y meta diaria.
 * Misma interfaz que la web, pero asíncrona: en nativo no hay
 * almacenamiento síncrono. Sin backend: la memoria vive en el dispositivo.
 */

export interface Progress {
  lastDay: string; // YYYY-MM-DD del último día activo
  mastered: number;
  phrases: string[];
  todayCount: number; // frases dominadas HOY (meta diaria)
}

/** Meta diaria: sesiones cortas y consistentes ganan (3 frases ≈ 3-5 min) */
export const DAILY_GOAL = 3;

export function masteredToday(p: Progress): number {
  const today = new Date().toISOString().slice(0, 10);
  return p.lastDay === today ? p.todayCount ?? 0 : 0;
}

const KEY = 'pio-progress-v1';

const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      return JSON.parse(raw) as Progress;
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return { lastDay: '', mastered: 0, phrases: [], todayCount: 0 };
}

async function save(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

/** Marca actividad de hoy (sin rachas: el progreso solo suma, nunca castiga) */
function touchDay(p: Progress) {
  const today = day();
  if (p.lastDay === today) return;
  p.lastDay = today;
  p.todayCount = 0; // nuevo día, nueva meta
}

/** Frase dominada (≥7/10): cuenta una sola vez por frase */
export async function recordMastery(phrase: string): Promise<Progress> {
  const p = await loadProgress();
  touchDay(p);
  const key = phrase.trim().toLowerCase();
  if (!p.phrases.includes(key)) {
    p.phrases.push(key);
    if (p.phrases.length > 300) p.phrases.shift();
    p.mastered += 1;
  }
  p.todayCount = (p.todayCount ?? 0) + 1;
  await save(p);
  return p;
}
