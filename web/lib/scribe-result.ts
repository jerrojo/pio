import { z } from "zod";
import type { Evidence, Turn, Word } from "./domain.ts";
import { canon, isFiller, nearWord, pieces, sameWord } from "./words.ts";

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
  const language = turn.preferences.target;
  const key = (text: string) => canon(text, language);
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
  let scored = heard.map((w) => ({
    text: w.text,
    key: w.key,
    accuracy: clarity(w.logprob as number),
  }));
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
  let expected = pieces(turn.reference.text)
    .map((text) => ({ text: display(text), key: key(text) }))
    .filter((w) => w.key);
  if (!expected.length) throw new Error("assessment-unavailable");
  // The recognizer and the written phrase may cut words differently ("L'ami"
  // against "L'" + "ami"): join neighbours when that makes them agree.
  const join = <T extends { text: string; key: string }>(
    list: T[],
    other: { key: string }[],
    merge: (a: T, b: T) => T,
  ) => {
    const known = new Set(other.map((w) => w.key));
    const out: T[] = [];
    for (let i = 0; i < list.length; i++) {
      const next = list[i + 1];
      if (
        next &&
        !known.has(list[i].key) &&
        known.has(list[i].key + next.key)
      ) {
        out.push(merge(list[i], next));
        i++;
      } else out.push(list[i]);
    }
    return out;
  };
  scored = join(scored, expected, (a, b) => ({
    text: a.text + b.text,
    key: a.key + b.key,
    accuracy: Math.min(a.accuracy, b.accuracy),
  }));
  expected = join(expected, scored, (a, b) => ({
    text: `${a.text} ${b.text}`,
    key: a.key + b.key,
  }));
  // Hesitations are not part of the attempt, unless the phrase has that word.
  const wanted = new Set(expected.map((w) => w.key));
  scored = scored.filter((w) => !isFiller(w.key) || wanted.has(w.key));
  if (!scored.length) throw new Error("assessment-unavailable");
  // One word practised alone: whatever was heard that sounds like it counts.
  if (expected.length === 1) {
    const hit = scored
      .filter((w) => nearWord(expected[0].key, w.key))
      .sort((a, b) => b.accuracy - a.accuracy)[0];
    return {
      ...common,
      mode: "scripted",
      text: turn.reference.text,
      accuracy: hit ? hit.accuracy : 0,
      completeness: hit ? 100 : 0,
      words: [
        {
          text: expected[0].text,
          accuracy: hit ? hit.accuracy : 0,
          error: hit ? "None" : "Omission",
        },
      ],
    };
  }
  // Longest common subsequence keeps word order. Reference words the learner
  // skipped or replaced are omissions; extra words (a repeated word, a
  // "please" at the end) are simply not part of the grade.
  const rows = expected.length,
    cols = scored.length;
  const table = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = rows - 1; i >= 0; i--)
    for (let j = cols - 1; j >= 0; j--)
      table[i][j] = sameWord(expected[i].key, scored[j].key)
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
  const words: Word[] = [];
  let i = 0,
    j = 0,
    matched = 0;
  while (i < rows) {
    if (j < cols && sameWord(expected[i].key, scored[j].key)) {
      words.push({
        text: expected[i].text,
        accuracy: scored[j].accuracy,
        error: "None",
      });
      matched++;
      i++;
      j++;
    } else if (j < cols && table[i][j + 1] >= table[i + 1][j]) j++;
    else {
      words.push({ text: expected[i].text, accuracy: 0, error: "Omission" });
      i++;
    }
  }
  return {
    ...common,
    mode: "scripted",
    text: turn.reference.text,
    accuracy: mean(words.map((w) => w.accuracy)),
    completeness: Math.round((matched / rows) * 100),
    words,
  };
}

// A second opinion on the words the recognizer did not write down. The aligner
// is told the phrase and reports how well the audio fits each word (lower is
// a better fit), so a learner's accent does not turn a word that was said
// into a missing one. It cannot hear fine mistakes; it only tells "this word
// is in there" from "something else was said". Bounds measured on recordings:
// words that were said fit at 0.6 to 1.2, other speech at 1.3 and above.
export const alignmentSchema = z.object({
  loss: z.number(),
  words: z.array(
    z.object({
      text: z.string(),
      start: z.number(),
      end: z.number(),
      loss: z.number(),
    }),
  ),
});
export function rescue(
  evidence: Evidence,
  alignment: z.infer<typeof alignmentSchema>,
): Evidence {
  const language = evidence.locale;
  const fits = alignment.words.flatMap((w) =>
    pieces(w.text)
      .filter((piece) => canon(piece, language))
      .map(() => ({ loss: w.loss, long: w.end - w.start >= 0.06 })),
  );
  const expected = evidence.words.flatMap((w) =>
    pieces(w.text).filter((piece) => canon(piece, language)),
  );
  // The whole audio is something else, or the words cannot be paired up.
  // A word said alone has nothing around it to lean on, so it must fit well.
  const limit = evidence.words.length === 1 ? 1 : 1.3;
  if (
    fits.filter((w) => w.loss >= 1.3).length * 2 > fits.length ||
    fits.length !== expected.length ||
    expected.length !== evidence.words.length
  )
    return evidence;
  const words = evidence.words.map((word, at) =>
    word.error === "Omission" && fits[at].long && fits[at].loss < limit
      ? {
          ...word,
          error: "None" as const,
          accuracy: fits[at].loss < 1 ? 75 : 60,
        }
      : word,
  );
  return {
    ...evidence,
    words,
    accuracy: mean(words.map((w) => w.accuracy)),
    completeness: Math.round(
      (words.filter((w) => w.error === "None").length / words.length) * 100,
    ),
  };
}
