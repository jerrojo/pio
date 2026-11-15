import { z } from "zod";
import type { Evidence, Turn } from "./domain.ts";
import { canon, pieces } from "./words.ts";
// Azure Speech pronunciation assessment. The REST reply carries the scores
// directly on each item; the SDK's JSON nests them in "PronunciationAssessment".
// Both are accepted.
const percentage = z.number().min(0).max(100);
const scores = z.object({
  AccuracyScore: percentage.optional(),
  CompletenessScore: percentage.optional(),
  ErrorType: z.string().optional(),
});
const scored = scores.extend({ PronunciationAssessment: scores.optional() });
const part = scored.extend({
  Syllable: z.string().optional(),
  Phoneme: z.string().optional(),
});
const word = scored.extend({
  Word: z.string().min(1),
  Syllables: z.array(part).optional(),
  Phonemes: z.array(part).optional(),
});
const schema = z.object({
  RecognitionStatus: z.union([z.literal("Success"), z.literal(0)]),
  NBest: z
    .array(scored.extend({ Display: z.string().min(1), Words: z.array(word) }))
    .min(1),
});
const of = (item: z.infer<typeof scored>) => ({
  ...item,
  ...item.PronunciationAssessment,
});
export function parseAzure(raw: unknown, turn: Turn): Evidence {
  const best = schema.parse(raw).NBest[0];
  const total = of(best);
  if (typeof total.AccuracyScore !== "number")
    throw new Error("assessment-unavailable");
  const language = turn.preferences.target;
  // Azure returns words in lower case without punctuation: show them the way
  // the phrase writes them.
  const written = new Map(
    pieces(turn.reference?.text || "").map((text) => [
      canon(text, language),
      text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""),
    ]),
  );
  const words = best.Words.map((entry) => {
    const own = of(entry);
    // The weakest named sound of the word, when the service names sounds for
    // this language (syllables and sound names are not offered for all).
    const sounds = (entry.Syllables?.length ? entry.Syllables : entry.Phonemes)
      ?.map((p) => ({
        text: p.Syllable || p.Phoneme || "",
        accuracy: of(p).AccuracyScore,
      }))
      .filter(
        (p): p is { text: string; accuracy: number } =>
          !!p.text && typeof p.accuracy === "number",
      );
    return {
      text: written.get(canon(entry.Word, language)) || entry.Word,
      accuracy: own.AccuracyScore ?? 0,
      error: own.ErrorType || "None",
      ...(sounds?.length ? { parts: sounds } : {}),
    };
  })
    // Extra words (a filler, a repeated word) are not part of the grade.
    .filter((w) => !turn.reference || w.error !== "Insertion");
  if (!words.length) throw new Error("assessment-unavailable");
  return {
    source: "azure-acoustic",
    audioId: turn.id,
    referenceId: turn.reference?.id ?? null,
    locale: language,
    mode: turn.reference ? "scripted" : "unscripted",
    text: turn.reference?.text || best.Display,
    accuracy: total.AccuracyScore,
    completeness: turn.reference ? (total.CompletenessScore ?? null) : null,
    words,
  };
}
