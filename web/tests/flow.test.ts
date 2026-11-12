import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMastery,
  countMastery,
  judge,
  readPreferences,
  readMastery,
  route,
  turnSchema,
  type Evidence,
  type Preferences,
  type Turn,
} from "../lib/domain.ts";
import { runTurn, type Services } from "../lib/turn.ts";
import { parseAzure } from "../lib/azure-result.ts";
import { encodeWav, validateWav } from "../lib/wav.ts";
const p: Preferences = { version: 3, native: "es-MX", target: "de-DE" };
const id = "00112233-4455-4677-8899-aabbccddeeff";
const reference = {
  id: "10112233-4455-4677-8899-aabbccddeeff",
  text: "Guten Morgen",
  locale: "de-DE" as const,
};
const turn: Turn = {
  id,
  preferences: p,
  reference: null,
  intent: "auto",
  history: [],
};
function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    source: "azure-acoustic",
    audioId: id,
    referenceId: null,
    locale: "de-DE",
    mode: "unscripted",
    text: "Guten Morgen",
    accuracy: 90,
    completeness: null,
    words: [
      { text: "Guten", accuracy: 90, error: "None" },
      { text: "Morgen", accuracy: 90, error: "None" },
    ],
    ...overrides,
  };
}
function mock(overrides: Partial<Services> = {}): Services {
  return {
    transcribe: async () => ({
      text: "Guten Morgen",
      language: "de",
      confidence: 0.99,
    }),
    assess: async () => evidence(),
    generate: async (task) =>
      task === "translate" ? "Guten Morgen" : "Guten Morgen! Wie geht es dir?",
    ...overrides,
  };
}
const signal = () => new AbortController().signal;
test("latest valid pair survives reload, including non-pilot pairs", () => {
  const last = { version: 3, native: "pt-BR", target: "it-IT" };
  assert.deepEqual(readPreferences(JSON.stringify(last)), last);
});
test("first visit does not silently choose a language", () =>
  assert.equal(readPreferences(null), null));
for (const raw of [
  "broken",
  "{}",
  '{"version":3,"native":"es-MX","target":"es-ES"}',
  '{"version":2,"native":"es-MX","target":"de-DE"}',
])
  test(`invalid preferences are not trusted: ${raw}`, () =>
    assert.equal(readPreferences(raw), null));
test("resetting conversation is independent from preferences contract", () =>
  assert.deepEqual(
    turnSchema.parse({ ...turn, reference: null }).preferences,
    p,
  ));
test("reference from a different language is rejected", () =>
  assert.equal(
    turnSchema.safeParse({
      ...turn,
      reference: { ...reference, locale: "fr-FR" },
    }).success,
    false,
  ));
test("native speech translates without grading", async () => {
  let called = false;
  const result = await runTurn(
    Buffer.alloc(1),
    turn,
    mock({
      transcribe: async () => ({
        text: "Buenos días",
        language: "es",
        confidence: 0.99,
      }),
      assess: async () => {
        called = true;
        throw new Error();
      },
    }),
    signal(),
  );
  assert.equal(result.outcome, "translation");
  assert.equal(result.reference?.text, "Guten Morgen");
  assert.equal(called, false);
});
test("target speech without a reference is acoustically assessed and conversation continues", async () => {
  const result = await runTurn(Buffer.alloc(1), turn, mock(), signal());
  assert.equal(result.outcome, "conversation");
  assert.match(result.text, /Wie/);
});
test("incorrect free speech becomes a repeatable reference instead of continuing conversation", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    turn,
    mock({
      assess: async () =>
        evidence({
          accuracy: 60,
          words: [{ text: "Morgen", accuracy: 45, error: "Mispronunciation" }],
        }),
      generate: async () => {
        throw new Error("must not converse");
      },
    }),
    signal(),
  );
  assert.equal(result.outcome, "practice");
  assert.equal(result.reference?.text, "Guten Morgen");
  assert.deepEqual(result.focus, ["Morgen"]);
});
test("scripted repetition stays in practice until it passes", async () => {
  const t = { ...turn, reference };
  const e = evidence({
    referenceId: reference.id,
    mode: "scripted",
    completeness: 100,
    accuracy: 79,
  });
  assert.equal(
    (
      await runTurn(
        Buffer.alloc(1),
        t,
        mock({ assess: async () => e }),
        signal(),
      )
    ).outcome,
    "practice",
  );
  assert.equal(
    (
      await runTurn(
        Buffer.alloc(1),
        t,
        mock({ assess: async () => ({ ...e, accuracy: 90 }) }),
        signal(),
      )
    ).outcome,
    "accepted",
  );
});
test("new native phrase replaces current exercise", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    { ...turn, reference },
    mock({
      transcribe: async () => ({
        text: "Quiero agua",
        language: "es",
        confidence: 0.99,
      }),
      generate: async () => "Ich möchte Wasser",
    }),
    signal(),
  );
  assert.equal(result.outcome, "translation");
  assert.equal(result.reference?.text, "Ich möchte Wasser");
  assert.notEqual(result.reference?.id, reference.id);
});
test("language ambiguity asks instead of guessing and preserves exercise", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    { ...turn, reference },
    mock({
      transcribe: async () => ({
        text: "Ja",
        language: "de",
        confidence: 0.55,
      }),
    }),
    signal(),
  );
  assert.equal(result.outcome, "clarify");
  assert.deepEqual(result.reference, reference);
});
test("explicit language resolves same recording", () =>
  assert.equal(
    route({ text: "Ja", language: "es", confidence: 0.5 }, p, "target"),
    "target",
  ));
test("third language asks for clarification", () =>
  assert.equal(
    route({ text: "Bonjour", language: "fr", confidence: 0.99 }, p, "auto"),
    "clarify",
  ));
test("silence never gets an accepted score", async () =>
  assert.equal(
    (
      await runTurn(
        Buffer.alloc(1),
        turn,
        mock({
          transcribe: async () => ({ text: "", language: "de", confidence: 0 }),
        }),
        signal(),
      )
    ).outcome,
    "no-speech",
  ));
test("provider failure rejects without fabricated grade", async () =>
  assert.rejects(
    () =>
      runTurn(
        Buffer.alloc(1),
        turn,
        mock({
          assess: async () => {
            throw new Error("provider-unavailable");
          },
        }),
        signal(),
      ),
    /provider-unavailable/,
  ));
test("translation failure does not return original text as translation", async () =>
  assert.rejects(
    () =>
      runTurn(
        Buffer.alloc(1),
        { ...turn, intent: "native" },
        mock({
          generate: async () => {
            throw new Error("offline");
          },
        }),
        signal(),
      ),
    /offline/,
  ));
test("blank translation is rejected", async () =>
  assert.rejects(
    () =>
      runTurn(
        Buffer.alloc(1),
        { ...turn, intent: "native" },
        mock({ generate: async () => "" }),
        signal(),
      ),
    /invalid-translation/,
  ));
test("cancellation after provider response cannot advance conversation", async () => {
  const c = new AbortController();
  await assert.rejects(() =>
    runTurn(
      Buffer.alloc(1),
      turn,
      mock({
        assess: async () => {
          c.abort();
          return evidence();
        },
      }),
      c.signal,
    ),
  );
});
for (const [name, change] of Object.entries({
  wrongAudio: { audioId: "other" },
  wrongLocale: { locale: "fr-FR" },
  missingWords: { words: [] },
  badScore: { accuracy: NaN },
  mismatchedReference: { referenceId: reference.id },
  wrongSource: { source: "transcript" },
}))
  test(`unverifiable evidence: ${name}`, () =>
    assert.equal(
      judge(evidence(change as Partial<Evidence>), id, p.target, null),
      "unavailable",
    ));
test("omitted word never passes on aggregate score alone", () =>
  assert.equal(
    judge(
      evidence({
        words: [{ text: "Morgen", accuracy: 100, error: "Omission" }],
      }),
      id,
      p.target,
      null,
    ),
    "practice",
  ));
test("scripted completeness is required; unscripted does not invent completeness", () => {
  assert.equal(judge(evidence(), id, p.target, null), "accepted");
  assert.equal(
    judge(
      evidence({ referenceId: reference.id, mode: "scripted" }),
      id,
      p.target,
      reference,
    ),
    "unavailable",
  );
});
test("Azure SDK response maps real acoustic evidence", () => {
  const raw = {
    RecognitionStatus: "Success",
    NBest: [
      {
        Display: "Guten Morgen",
        PronunciationAssessment: { AccuracyScore: 90 },
        Words: [
          {
            Word: "Guten",
            PronunciationAssessment: { AccuracyScore: 92, ErrorType: "None" },
          },
        ],
      },
    ],
  };
  assert.equal(parseAzure(raw, turn).completeness, null);
  assert.equal(parseAzure(raw, turn).words[0].accuracy, 92);
});
test("Azure transcript without assessment cannot pass parser", () =>
  assert.throws(() =>
    parseAzure(
      { RecognitionStatus: "Success", NBest: [{ Display: "Guten Morgen" }] },
      turn,
    ),
  ));
test("progress is idempotent and unique per day and language pair", async () => {
  const result = await runTurn(Buffer.alloc(1), turn, mock(), signal());
  const one = addMastery([], result, p, "2026-10-30");
  assert.equal(addMastery(one, result, p).length, 1);
  const duplicate = {
    ...result,
    id: "20112233-4455-4677-8899-aabbccddeeff",
    evidence: {
      ...result.evidence!,
      audioId: "20112233-4455-4677-8899-aabbccddeeff",
    },
  };
  const two = addMastery(one, duplicate, p, "2026-10-30");
  assert.equal(two.length, 2);
  assert.equal(countMastery(two, p, "2026-10-30"), 1);
  assert.equal(countMastery(two, { ...p, native: "en-US" }, "2026-10-30"), 0);
  assert.equal(countMastery(two, p, "2026-10-31"), 0);
});
test("malformed saved progress recovers safely", () =>
  assert.deepEqual(readMastery('[{"id":3}]'), []));
for (const rate of [16000, 44100, 48000])
  test(`capture creates supported PCM16 audio from ${rate}Hz`, () => {
    const input = Float32Array.from(
      { length: rate },
      (_, i) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / rate),
    );
    const wav = Buffer.from(encodeWav([input], rate));
    validateWav(wav);
    assert.equal(wav.length, 32044);
    assert.equal(wav.readUInt32LE(24), 16000);
  });
test("malformed or excessive audio is rejected before providers", () => {
  assert.throws(() => validateWav(Buffer.alloc(900000)), /invalid-audio/);
  assert.throws(() => validateWav(Buffer.alloc(100)), /invalid-audio/);
});

test("overlong utterance fails before creating an unusable exercise", async () => {
  await assert.rejects(
    () =>
      runTurn(
        Buffer.alloc(1),
        turn,
        mock({
          transcribe: async () => ({
            text: "a".repeat(501),
            language: "de",
            confidence: 0.99,
          }),
        }),
        signal(),
      ),
    /phrase-too-long/,
  );
});
