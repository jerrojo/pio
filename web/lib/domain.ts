import { z } from "zod";

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
export const preferencesSchema = z
  .object({
    version: z.literal(3),
    native: z.enum(locales),
    target: z.enum(locales),
  })
  .refine((p) => base(p.native) !== base(p.target));
export type Preferences = z.infer<typeof preferencesSchema>;
export const preferenceKey = "pio.preferences.v3";
// No fixed pair on restart. First use asks; every later visit restores the saved pair.
export function readPreferences(raw: string | null): Preferences | null {
  try {
    const r = preferencesSchema.safeParse(JSON.parse(raw || "null"));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
export const referenceSchema = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(500),
  locale: z.enum(locales),
});
export type Reference = z.infer<typeof referenceSchema>;
export const turnSchema = z
  .object({
    id: z.string().uuid(),
    preferences: preferencesSchema,
    reference: referenceSchema.nullable(),
    intent: z.enum(["auto", "native", "target"]).default("auto"),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string().max(600),
        }),
      )
      .max(8)
      .default([]),
  })
  .refine((x) => !x.reference || x.reference.locale === x.preferences.target);
export type Turn = z.infer<typeof turnSchema>;
export type Transcript = { text: string; language: string; confidence: number };
export type Word = { text: string; accuracy: number; error: string };
export type Evidence = {
  source: "azure-acoustic";
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
  | "clarify"
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
    e.source !== "azure-acoustic" ||
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
  return e.accuracy >= 80 &&
    (!reference || e.completeness! >= 95) &&
    e.words.every(
      (w) =>
        w.accuracy >= 70 &&
        !["Omission", "Insertion", "Mispronunciation"].includes(w.error),
    )
    ? "accepted"
    : "practice";
}
export function route(
  t: Transcript,
  p: Preferences,
  intent: Turn["intent"],
): "native" | "target" | "clarify" | "no-speech" {
  if (!t.text.trim()) return "no-speech";
  if (intent !== "auto") return intent;
  if (!score(t.confidence * 100) || t.confidence < 0.8) return "clarify";
  const lang = base(t.language);
  return lang === base(p.native)
    ? "native"
    : lang === base(p.target)
      ? "target"
      : "clarify";
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
    !["accepted", "conversation"].includes(r.outcome) ||
    judge(r.evidence, r.id, p.target, r.reference) !== "accepted" ||
    entries.some((e) => e.id === r.id)
  )
    return entries;
  const phrase = (r.reference?.text || r.heard)
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase();
  return [
    ...entries,
    { id: r.id, pair: `${p.native}:${p.target}`, phrase, day },
  ].slice(-2000);
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
    return z
      .array(
        z.object({
          id: z.string().uuid(),
          pair: z.string(),
          phrase: z.string(),
          day: z.string(),
        }),
      )
      .max(2000)
      .parse(JSON.parse(raw || "[]"));
  } catch {
    return [];
  }
}
