import { z } from "zod";
import type { Evidence, Turn } from "./domain.ts";
const percentage = z.number().min(0).max(100);
const assessment = z.object({
  AccuracyScore: percentage,
  CompletenessScore: percentage.optional(),
});
const word = z.object({
  Word: z.string().min(1),
  PronunciationAssessment: z.object({
    AccuracyScore: percentage,
    ErrorType: z.string(),
  }),
});
const schema = z.object({
  RecognitionStatus: z.literal("Success"),
  NBest: z
    .array(
      z.object({
        Display: z.string().min(1),
        PronunciationAssessment: assessment,
        Words: z.array(word).min(1),
      }),
    )
    .min(1),
});
export function parseAzure(raw: unknown, turn: Turn): Evidence {
  const best = schema.parse(raw).NBest[0];
  return {
    source: "azure-acoustic",
    audioId: turn.id,
    referenceId: turn.reference?.id ?? null,
    locale: turn.preferences.target,
    mode: turn.reference ? "scripted" : "unscripted",
    text: best.Display,
    accuracy: best.PronunciationAssessment.AccuracyScore,
    completeness: best.PronunciationAssessment.CompletenessScore ?? null,
    words: best.Words.map((w) => ({
      text: w.Word,
      accuracy: w.PronunciationAssessment.AccuracyScore,
      error: w.PronunciationAssessment.ErrorType,
    })),
  };
}
