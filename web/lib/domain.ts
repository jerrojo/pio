import { keysOf } from "./words.ts";

// One variety of each language: fewer choices, and the same voice for all.
export const locales = [
  "es-MX",
  "en-US",
  "de-DE",
  "fr-FR",
  "it-IT",
  "pt-BR",
] as const;
export type Locale = (typeof locales)[number];
// Varieties that used to be offered separately. What was saved under one of
// them now belongs to its language.
const former: Record<string, Locale> = {
  "es-ES": "es-MX",
  "en-GB": "en-US",
  "pt-PT": "pt-BR",
};
const current = (locale: unknown) =>
  (typeof locale === "string" && former[locale]) || locale;
const currentPair = (pair: string) => pair.split(":").map(current).join(":");
export const base = (locale: string) => locale.split("-")[0];
export type Preferences = { version: 3; native: Locale; target: Locale };
const isLocale = (value: unknown): value is Locale =>
  locales.includes(value as Locale);
export const preferenceKey = "pio.preferences.v3";
// No fixed pair on restart. First use asks; every later visit restores the saved pair.
export function readPreferences(raw: string | null): Preferences | null {
  try {
    const p = JSON.parse(raw || "null");
    if (p && typeof p === "object") {
      p.native = current(p.native);
      p.target = current(p.target);
    }
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
  // The phrase was already said well, or is something Pío answered: it is
  // still there to be said again, but other speech is not an attempt at it.
  loose?: boolean;
  history: { role: "user" | "assistant"; text: string }[];
};
export type Transcript = { text: string; language: string; confidence: number };
export type Word = {
  text: string;
  accuracy: number;
  error: string;
  // Syllables or sounds of the word with their own score, when the assessor
  // provides them.
  parts?: { text: string; accuracy: number }[];
};
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
  // After a missed word: one short piece of advice about the sound to fix,
  // in the learner's own language. Advice only; it never decides the grade.
  tip?: string;
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
  // A short sentence ("te amo") reads the same in the sister languages.
  es: ["ca", "cat", "gl", "glg", "oc", "oci", "ast", "an", "arg", "pt", "it"],
  pt: ["gl", "glg", "es"],
  it: ["co", "cos", "sc", "srd", "es"],
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
          pair: currentPair(e.pair),
          phrase: e.phrase,
          day: e.day,
        }))
      : [];
  } catch {
    return [];
  }
}
// Phrases that needed help, kept so the learner can come back to them. Each
// one carries the proof that lets Pío say it again without a new translation.
export type Pending = {
  pair: string;
  text: string;
  proof: string;
  // Words that did not come through, as shown on the phrase.
  words: string[];
  day: string;
  // The day it was finally said well. Kept that day for the summary.
  won?: string;
};
export const reviewKey = "pio.review.v1";
const samePhrase = (a: string, b: string) =>
  keysOf(a).join(" ") === keysOf(b).join(" ");
export function addPending(
  list: Pending[],
  r: Result,
  proof: string | undefined,
  p: Preferences,
  day = localDay(),
): Pending[] {
  if (r.outcome !== "practice" || !r.reference || !proof) return list;
  const pair = `${p.native}:${p.target}`,
    text = r.reference.text;
  const old = list.find((e) => e.pair === pair && samePhrase(e.text, text));
  const words = [...new Set([...(old?.words || []), ...r.focus])].slice(0, 12);
  return [
    ...list.filter((e) => e !== old),
    { pair, text, proof, words, day },
  ].slice(-40);
}
export function winPending(
  list: Pending[],
  r: Result,
  p: Preferences,
  day = localDay(),
): Pending[] {
  if (r.outcome !== "accepted" || !r.reference) return list;
  const pair = `${p.native}:${p.target}`,
    text = r.reference.text;
  return list.map((e) =>
    e.pair === pair && !e.won && samePhrase(e.text, text)
      ? { ...e, won: day }
      : e,
  );
}
// Still to be said well, newest first.
export const pendingFor = (list: Pending[], p: Preferences) =>
  list.filter((e) => e.pair === `${p.native}:${p.target}` && !e.won).reverse();
// Words that took work today, whether or not the phrase came out in the end.
export function hardToday(list: Pending[], p: Preferences, day = localDay()) {
  return [
    ...new Set(
      list
        .filter(
          (e) =>
            e.pair === `${p.native}:${p.target}` &&
            (e.day === day || e.won === day),
        )
        .flatMap((e) => e.words),
    ),
  ];
}
export function readReview(raw: string | null, day = localDay()): Pending[] {
  try {
    const list: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(list) || list.length > 40) return [];
    const text = (v: unknown): v is string => typeof v === "string";
    return (
      list
        .filter(
          (e) =>
            e &&
            text(e.pair) &&
            text(e.text) &&
            e.text.length <= 500 &&
            text(e.proof) &&
            text(e.day) &&
            Array.isArray(e.words) &&
            e.words.length <= 12 &&
            e.words.every(text) &&
            (e.won === undefined || text(e.won)) &&
            // Its proof was made for a variety that is no longer offered, so
            // Pío could not say it again.
            !former[e.pair.split(":")[1]],
        )
        .map((e) => ({
          pair: currentPair(e.pair),
          text: e.text,
          proof: e.proof,
          words: e.words,
          day: e.day,
          ...(e.won ? { won: e.won } : {}),
        }))
        // A phrase already won only matters for that day's summary.
        .filter((e) => !e.won || e.won === day)
    );
  } catch {
    return [];
  }
}
