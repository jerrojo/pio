import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Repaso espaciado con recall de PRODUCCIÓN oral (inspirado en FSRS/
 * graduated interval recall de Pimsleur): las frases que fallas vuelven
 * pronto; las que dominas, a intervalos crecientes. Misma lógica que la
 * web, con AsyncStorage (asíncrono) en lugar de localStorage.
 */

export interface ReviewItem {
  native: string;   // la frase en tu idioma ("te quiero")
  target: string;   // la frase objetivo ("ich liebe dich")
  due: number;      // timestamp del próximo repaso
  interval: number; // ms del intervalo actual
  reps: number;     // repasos exitosos consecutivos
}

const KEY = 'pio-review-v1';
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const FAIL_INTERVAL = 10 * MIN;  // fallaste → vuelve en 10 min
const FIRST_INTERVAL = 1 * DAY;  // primer éxito → mañana
const GROWTH = 2.5;              // luego crece 2.5x (FSRS-lite)
const MAX_ITEMS = 200;

async function load(): Promise<ReviewItem[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
  } catch {
    return [];
  }
}

async function save(items: ReviewItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* noop */
  }
}

const norm = (s: string) => s.trim().toLowerCase();

/** Registra el resultado de un intento y agenda el próximo repaso */
export async function scheduleReview(
  native: string,
  target: string,
  success: boolean
): Promise<void> {
  if (!target.trim()) return;
  const items = await load();
  const key = norm(target);
  let item = items.find(i => norm(i.target) === key);

  if (!item) {
    item = { native, target, due: 0, interval: 0, reps: 0 };
    items.push(item);
  }
  if (native) item.native = native;

  if (success) {
    item.reps += 1;
    item.interval = item.reps === 1 ? FIRST_INTERVAL : item.interval * GROWTH;
  } else {
    item.reps = 0;
    item.interval = FAIL_INTERVAL;
  }
  item.due = Date.now() + item.interval;
  await save(items);
}

/** La frase más urgente pendiente de repaso (o null) */
export async function getDueReview(): Promise<ReviewItem | null> {
  const due = (await load()).filter(i => i.due <= Date.now());
  if (due.length === 0) return null;
  due.sort((a, b) => a.due - b.due);
  return due[0];
}

export async function pendingReviews(): Promise<number> {
  return (await load()).filter(i => i.due <= Date.now()).length;
}
