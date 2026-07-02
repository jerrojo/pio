'use client';

/**
 * Progreso local (localStorage): racha diaria y frases dominadas.
 * Sin backend: la memoria vive en el dispositivo hasta que exista auth real.
 */

export interface Progress {
  streak: number;
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

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      // La racha se rompe si el último día activo no fue hoy ni ayer
      if (p.lastDay !== day() && p.lastDay !== day(-1)) p.streak = 0;
      return p;
    }
  } catch {
    /* localStorage no disponible */
  }
  return { streak: 0, lastDay: '', mastered: 0, phrases: [], todayCount: 0 };
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

/** Marca actividad de hoy: extiende la racha (ayer→hoy) o la reinicia */
function touchDay(p: Progress) {
  const today = day();
  if (p.lastDay === today) return;
  p.streak = p.lastDay === day(-1) ? p.streak + 1 : 1;
  p.lastDay = today;
  p.todayCount = 0; // nuevo día, nueva meta
}

/** Frase dominada (≥7/10): cuenta una sola vez por frase */
export function recordMastery(phrase: string): Progress {
  const p = loadProgress();
  touchDay(p);
  const key = phrase.trim().toLowerCase();
  if (!p.phrases.includes(key)) {
    p.phrases.push(key);
    if (p.phrases.length > 300) p.phrases.shift();
    p.mastered += 1;
  }
  p.todayCount = (p.todayCount ?? 0) + 1;
  save(p);
  return p;
}
