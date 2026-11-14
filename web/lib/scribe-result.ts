import { z } from "zod";
import type { Evidence, Turn, Word } from "./domain.ts";

// ElevenLabs Scribe response, limited to the fields Pío relies on.
const schema = z.object({
  text: z.string().max(2000),
  language_code: z.string(),
  language_probability: z.number().min(0).max(1),
  words: z
    .array(
      z.object({
        text: z.string(),
        type: z.string().optional(),
        logprob: z.number().nullable().optional(),
      }),
    )
    .default([]),
});
export type ScribeResponse = z.infer<typeof schema>;
export const parseScribe = (raw: unknown): ScribeResponse => schema.parse(raw);

const key = (text: string) =>
  text
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
const display = (text: string) =>
  text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
const clarity = (logprob: number) =>
  Math.max(0, Math.min(100, Math.round(Math.exp(logprob) * 100)));
const mean = (values: number[]) =>
  Math.round(values.reduce((a, b) => a + b, 0) / values.length);

// Clarity evidence: how confidently the recognizer heard each word in the
// learner's own audio, plus which reference words were missing or replaced.
// It measures intelligibility, not phonemes: it can say a word was not
// understood, never which sound was wrong. Without per-word audio confidence
// there is no evidence and therefore no grade.
export function scribeEvidence(response: ScribeResponse, turn: Turn): Evidence {
  const heard = response.words
    .filter((w) => (w.type ?? "word") === "word" && key(w.text))
    .map((w) => ({
      text: display(w.text),
      key: key(w.text),
      logprob: w.logprob,
    }));
  if (
    !heard.length ||
    heard.some((w) => typeof w.logprob !== "number" || w.logprob > 0)
  )
    throw new Error("assessment-unavailable");
  const scored = heard.map((w) => ({ ...w, accuracy: clarity(w.logprob!) }));
  const common = {
    source: "scribe-clarity" as const,
    audioId: turn.id,
    referenceId: turn.reference?.id ?? null,
    locale: turn.preferences.target,
  };
  if (!turn.reference)
    return {
      ...common,
      mode: "unscripted",
      text: response.text.trim(),
      accuracy: mean(scored.map((w) => w.accuracy)),
      completeness: null,
      words: scored.map((w) => ({
        text: w.text,
        accuracy: w.accuracy,
        error: "None",
      })),
    };
  const expected = turn.reference.text
    .split(/\s+/)
    .map((text) => ({ text: display(text), key: key(text) }))
    .filter((w) => w.key);
  if (!expected.length) throw new Error("assessment-unavailable");
  // Longest common subsequence keeps word order: skipped words are omissions,
  // extra or different words are insertions.
  const rows = expected.length,
    cols = scored.length;
  const table = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = rows - 1; i >= 0; i--)
    for (let j = cols - 1; j >= 0; j--)
      table[i][j] =
        expected[i].key === scored[j].key
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
  const words: Word[] = [];
  let i = 0,
    j = 0,
    matched = 0;
  const expectedScores: number[] = [];
  while (i < rows || j < cols) {
    if (i < rows && j < cols && expected[i].key === scored[j].key) {
      words.push({
        text: expected[i].text,
        accuracy: scored[j].accuracy,
        error: "None",
      });
      expectedScores.push(scored[j].accuracy);
      matched++;
      i++;
      j++;
    } else if (j < cols && (i === rows || table[i][j + 1] >= table[i + 1][j])) {
      words.push({
        text: scored[j].text,
        accuracy: scored[j].accuracy,
        error: "Insertion",
      });
      j++;
    } else {
      words.push({ text: expected[i].text, accuracy: 0, error: "Omission" });
      expectedScores.push(0);
      i++;
    }
  }
  return {
    ...common,
    mode: "scripted",
    text: turn.reference.text,
    accuracy: mean(expectedScores),
    completeness: Math.round((matched / rows) * 100),
    words,
  };
}
