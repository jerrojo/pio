import { keysOf } from "./words.ts";

export const locales = [
  "es-MX",
  "es-ES",
  "en-US",
  "en-GB",
  "de-DE",
  "fr-FR",
  "it-IT",
  "pt-BR",
  "pt-PT",
] as const;
export type Locale = (typeof locales)[number];
export const names: Record<Locale, string> = {
  "es-MX": "Español · México",
  "es-ES": "Español · España",
  "en-US": "Inglés · EE. UU.",
  "en-GB": "Inglés · Reino Unido",
  "de-DE": "Alemán",
  "fr-FR": "Francés",
  "it-IT": "Italiano",
  "pt-BR": "Portugués · Brasil",
  "pt-PT": "Portugués · Portugal",
};
export const base = (locale: string) => locale.split("-")[0];
export type Preferences = { version: 3; native: Locale; target: Locale };
const isLocale = (value: unknown): value is Locale =>
  locales.includes(value as Locale);
export const preferenceKey = "pio.preferences.v3";
// No fixed pair on restart. First use asks; every later visit restores the saved pair.
export function readPreferences(raw: string | null): Preferences | null {
  try {
    const p = JSON.parse(raw || "null");
    return p &&
      p.version === 3 &&
      isLocale(p.native) &&
      isLocale(p.target) &&
      base(p.native) !== base(p.target)
      ? { version: 3, native: p.native, target: p.target }
      : null;
  } catch {
    return null;
  }
}
export type Reference = { id: string; text: string; locale: Locale };
export type Turn = {
  id: string;
  preferences: Preferences;
  reference: Reference | null;
  intent: "auto" | "native" | "target";
  history: { role: "user" | "assistant"; text: string }[];
};
export type Transcript = { text: string; language: string; confidence: number };
export type Word = { text: string; accuracy: number; error: string };
export type Evidence = {
  // azure-acoustic: phoneme-level assessment. scribe-clarity: per-word
  // recognizer confidence on the learner's audio (intelligibility).
  source: "azure-acoustic" | "scribe-clarity";
  audioId: string;
  referenceId: string | null;
  locale: Locale;
  mode: "scripted" | "unscripted";
  text: string;
  accuracy: number;
  completeness: number | null;
  words: Word[];
};
export type Outcome =
  | "translation"
  | "practice"
  | "accepted"
  | "conversation"
  | "no-speech"
  | "unavailable";
export type Result = {
  id: string;
  outcome: Outcome;
  heard: string;
  text: string;
  reference: Reference | null;
  evidence: Evidence | null;
  focus: string[];
  // Every word of the phrase that did not come through, in order: what the
  // guided practice goes through one by one.
  weak?: string[];
  // What Pío's reply means, in the learner's own language.
  gloss?: string;
  // Proof that the server produced `text`, required to ask for its voice.
  voice?: string;
};
const score = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
// Provisional thresholds: must be calibrated with native-speaker reviewed recordings.
export function judge(
  e: Evidence,
  audioId: string,
  locale: Locale,
  reference: Reference | null,
): "accepted" | "practice" | "unavailable" {
  if (
    !["azure-acoustic", "scribe-clarity"].includes(e.source) ||
    e.audioId !== audioId ||
    e.locale !== locale ||
    e.referenceId !== (reference?.id ?? null) ||
    e.mode !== (reference ? "scripted" : "unscripted") ||
    !e.text.trim() ||
    e.text.length > 500 ||
    !score(e.accuracy) ||
    !e.words.length ||
    e.words.some((w) => !w.text.trim() || !score(w.accuracy))
  )
    return "unavailable";
  if (reference && !score(e.completeness)) return "unavailable";
  // Clear enough on the whole, nothing missing, no word lost entirely, and at
  // most one in four words merely doubtful: short function words are often
  // heard with low confidence even when they were said well.
  const doubtful = e.words.filter((w) => w.accuracy < 70).length;
  // A single word practised alone only has to be recognisable.
  if (reference && e.words.length === 1)
    return e.words[0].error === "None" && e.words[0].accuracy >= 45
      ? "accepted"
      : "practice";
  return e.accuracy >= 72 &&
    (!reference || e.completeness! >= 95) &&
    doubtful <= Math.floor(e.words.length / 4) &&
    e.words.every(
      (w) =>
        w.accuracy >= 50 &&
        !["Omission", "Insertion", "Mispronunciation"].includes(w.error),
    )
    ? "accepted"
    : "practice";
}
// Languages the detector may guess for someone speaking their own language.
const lookalikes: Record<string, string[]> = {
  es: ["ca", "cat", "gl", "glg", "oc", "oci", "ast", "an", "arg"],
  pt: ["gl", "glg"],
  it: ["co", "cos", "sc", "srd"],
  fr: ["oc", "oci", "ca", "cat"],
  de: ["lb", "ltz", "gsw"],
  en: ["sco"],
};
export function route(
  t: Transcript,
  p: Preferences,
  intent: Turn["intent"],
): "native" | "target" | "no-speech" {
  if (!/[\p{L}\p{N}]/u.test(t.text)) return "no-speech";
  if (intent !== "auto") return intent;
  // Never stop to ask. Native speech is recognised reliably; anything else is
  // treated as an attempt at the language being learned, where an accent
  // lowers the detector's confidence or makes it guess a neighbouring language.
  const heard = base(t.language.toLowerCase()),
    native = base(p.native),
    target = base(p.target);
  if (heard === native) return "native";
  if (heard === target) return "target";
  return lookalikes[native]?.includes(heard) ? "native" : "target";
}
export type Mastered = {
  id: string;
  pair: string;
  phrase: string;
  day: string;
};
export const progressKey = "pio.mastery.v3";
export function localDay(now = new Date()) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
export function addMastery(
  entries: Mastered[],
  r: Result,
  p: Preferences,
  day = localDay(),
): Mastered[] {
  if (
    !r.evidence ||
    r.outcome !== "accepted" ||
    !r.reference ||
    judge(r.evidence, r.id, p.target, r.reference) !== "accepted" ||
    entries.some((e) => e.id === r.id)
  )
    return entries;
  // Punctuation and capitals do not make a different phrase.
  const phrase = keysOf(r.reference.text).join(" ");
  return [
    ...entries,
    { id: r.id, pair: `${p.native}:${p.target}`, phrase, day },
  ].slice(-2000);
}
// Consecutive days, ending today or yesterday, with at least one phrase.
export function streak(entries: Mastered[], p: Preferences, now = new Date()) {
  const days = new Set(
    entries
      .filter((e) => e.pair === `${p.native}:${p.target}`)
      .map((e) => e.day),
  );
  const cursor = new Date(now);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
export function countMastery(
  entries: Mastered[],
  p: Preferences,
  day = localDay(),
) {
  return new Set(
    entries
      .filter((e) => e.pair === `${p.native}:${p.target}` && e.day === day)
      .map((e) => e.phrase),
  ).size;
}
export function readMastery(raw: string | null): Mastered[] {
  try {
    const list: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(list) || list.length > 2000) return [];
    const text = (v: unknown): v is string => typeof v === "string";
    return list.every(
      (e) => e && text(e.id) && text(e.pair) && text(e.phrase) && text(e.day),
    )
      ? list.map((e) => ({
          id: e.id,
          pair: e.pair,
          phrase: e.phrase,
          day: e.day,
        }))
      : [];
  } catch {
    return [];
  }
}
