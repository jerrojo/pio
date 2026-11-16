import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMastery,
  countMastery,
  judge,
  readPreferences,
  readMastery,
  route,
  streak,
  type Evidence,
  type Preferences,
  type Turn,
} from "../lib/domain.ts";
import { turnSchema } from "../lib/schemas.ts";
import { runTurn, type Services } from "../lib/turn.ts";
import { parseAzure } from "../lib/azure-result.ts";
import { parseScribe, scribeEvidence } from "../lib/scribe-result.ts";
import { cleanReply } from "../lib/words.ts";
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
test("free speech is answered, and the learner's own sentence never becomes the model phrase", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    turn,
    mock({
      assess: async () =>
        evidence({
          text: "Ich habe gestern gegeht",
          accuracy: 60,
          words: [{ text: "gegeht", accuracy: 45, error: "None" }],
        }),
    }),
    signal(),
  );
  assert.equal(result.outcome, "conversation");
  assert.equal(result.reference?.text, result.text);
  assert.notEqual(result.reference?.text, "Ich habe gestern gegeht");
  assert.equal(result.heard, "Ich habe gestern gegeht");
});
const coffee = {
  ...reference,
  text: "Ich möchte einen Kaffee bestellen",
};
const graded = async () =>
  evidence({
    referenceId: reference.id,
    mode: "scripted",
    completeness: 100,
  });
test("an attempt the recognizer wrote down as the learner's own language is still graded", async () => {
  let translated = false;
  const result = await runTurn(
    Buffer.alloc(1),
    { ...turn, reference: coffee },
    mock({
      transcribe: async () => ({
        text: "Ij mojte ainen cafe bestelen",
        language: "es",
        confidence: 0.95,
      }),
      assess: graded,
      generate: async () => {
        translated = true;
        return "x";
      },
    }),
    signal(),
  );
  assert.equal(translated, false);
  assert.ok(["practice", "accepted"].includes(result.outcome));
});
test("a phrase already said well is graded again when repeated, never answered", async () => {
  let answered = false;
  const result = await runTurn(
    Buffer.alloc(1),
    { ...turn, reference, loose: true },
    mock({
      assess: graded,
      generate: async () => {
        answered = true;
        return "x";
      },
    }),
    signal(),
  );
  assert.equal(answered, false);
  assert.equal(result.outcome, "accepted");
});
test("with a phrase already done, new speech is taken for what it is", async () => {
  const done = { ...turn, reference: coffee, loose: true };
  const native = await runTurn(
    Buffer.alloc(1),
    done,
    mock({
      transcribe: async () => ({
        text: "Dónde está la estación",
        language: "es",
        confidence: 0.6,
      }),
    }),
    signal(),
  );
  assert.equal(native.outcome, "translation");
  // Speech in the language being learned that does not match the phrase is a
  // failed attempt at it: every word goes to guided practice.
  let answered = false;
  const missed = await runTurn(
    Buffer.alloc(1),
    done,
    mock({
      transcribe: async () => ({
        text: "Guten Tag wie geht es",
        language: "de",
        confidence: 0.9,
      }),
      assess: async () =>
        evidence({
          referenceId: coffee.id,
          mode: "scripted",
          text: coffee.text,
          accuracy: 0,
          completeness: 0,
          words: coffee.text
            .split(" ")
            .map((text) => ({ text, accuracy: 0, error: "Omission" })),
        }),
      generate: async () => {
        answered = true;
        return "x";
      },
    }),
    signal(),
  );
  assert.equal(answered, false);
  assert.equal(missed.outcome, "practice");
  assert.equal(missed.weak?.length, 5);
});
test("scripted repetition stays in practice until it passes", async () => {
  const t = { ...turn, reference };
  const e = evidence({
    referenceId: reference.id,
    mode: "scripted",
    completeness: 100,
    accuracy: 60,
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
test("low language confidence is treated as an attempt, never a question", () =>
  assert.equal(
    route({ text: "Ja", language: "de", confidence: 0.55 }, p, "auto"),
    "target",
  ));
test("explicit language resolves same recording", () =>
  assert.equal(
    route({ text: "Ja", language: "es", confidence: 0.5 }, p, "target"),
    "target",
  ));
test("a misdetected language is treated as the language being learned", () =>
  assert.equal(
    route({ text: "Hallo", language: "nl", confidence: 0.4 }, p, "auto"),
    "target",
  ));
test("native speech is routed to translation at any confidence", () =>
  assert.equal(
    route({ text: "Hola", language: "es", confidence: 0.6 }, p, "auto"),
    "native",
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
test("Azure pronunciation scores are read from both reply shapes and shown as the phrase writes them", () => {
  const t = {
    ...turn,
    reference: { ...reference, text: "Guten Morgen, Anna!" },
  };
  const flat = parseAzure(
    {
      RecognitionStatus: "Success",
      NBest: [
        {
          Display: "Guten Morgen Anna.",
          AccuracyScore: 71,
          CompletenessScore: 100,
          Words: [
            { Word: "guten", AccuracyScore: 92, ErrorType: "None" },
            { Word: "äh", AccuracyScore: 80, ErrorType: "Insertion" },
            {
              Word: "morgen",
              AccuracyScore: 41,
              ErrorType: "Mispronunciation",
              Phonemes: [
                { Phoneme: "m", AccuracyScore: 90 },
                { Phoneme: "", AccuracyScore: 20 },
              ],
            },
            { Word: "anna", AccuracyScore: 88, ErrorType: "None" },
          ],
        },
      ],
    },
    t,
  );
  assert.equal(flat.source, "azure-acoustic");
  assert.equal(flat.completeness, 100);
  assert.deepEqual(
    flat.words.map((w) => [w.text, w.accuracy, w.error]),
    [
      ["Guten", 92, "None"],
      ["Morgen", 41, "Mispronunciation"],
      ["Anna", 88, "None"],
    ],
  );
  assert.deepEqual(flat.words[1].parts, [{ text: "m", accuracy: 90 }]);
  assert.equal(judge(flat, t.id, "de-DE", t.reference), "practice");
  const nested = parseAzure(
    {
      RecognitionStatus: 0,
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
    },
    turn,
  );
  assert.equal(nested.completeness, null);
  assert.equal(nested.words[0].accuracy, 92);
});
test("Azure transcript without assessment cannot pass parser", () =>
  assert.throws(() =>
    parseAzure(
      { RecognitionStatus: "Success", NBest: [{ Display: "Guten Morgen" }] },
      turn,
    ),
  ));
test("progress is idempotent and unique per day and language pair", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    { ...turn, reference },
    mock({
      assess: async () =>
        evidence({
          referenceId: reference.id,
          mode: "scripted",
          completeness: 100,
        }),
    }),
    signal(),
  );
  assert.equal(result.outcome, "accepted");
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

test("Scribe clarity evidence accepts a clearly heard reference and flags omitted, replaced and unclear words", () => {
  const t = turnSchema.parse({
    id: crypto.randomUUID(),
    preferences: { version: 3, native: "es-MX", target: "de-DE" },
    reference: {
      id: crypto.randomUUID(),
      text: "Ich möchte einen Kaffee bestellen.",
      locale: "de-DE",
    },
  });
  const w = (text: string, logprob: number) => ({
    text,
    type: "word",
    logprob,
  });
  const response = (words: unknown[]) =>
    parseScribe({
      text: "x",
      language_code: "deu",
      language_probability: 0.99,
      words,
    });
  const clear = scribeEvidence(
    response([
      w("Ich", -0.02),
      { text: " ", type: "spacing" },
      w("möchte", -0.03),
      w("einen", -0.05),
      w("Kaffee", -0.02),
      w("bestellen.", -0.04),
    ]),
    t,
  );
  assert.equal(clear.source, "scribe-clarity");
  assert.equal(clear.completeness, 100);
  assert.equal(judge(clear, t.id, "de-DE", t.reference), "accepted");
  const omitted = scribeEvidence(
    response([
      w("Ich", -0.02),
      w("möchte", -0.03),
      w("Kaffee", -0.02),
      w("bestellen", -0.04),
    ]),
    t,
  );
  assert.equal(omitted.completeness, 80);
  assert.deepEqual(
    omitted.words.filter((x) => x.error === "Omission").map((x) => x.text),
    ["einen"],
  );
  assert.equal(judge(omitted, t.id, "de-DE", t.reference), "practice");
  const replaced = scribeEvidence(
    response([
      w("Ich", -0.02),
      w("möchte", -0.03),
      w("einen", -0.05),
      w("Tee", -0.02),
      w("bestellen", -0.04),
    ]),
    t,
  );
  // Only words of the phrase are ever listed: the learner is shown "Kaffee",
  // never the "Tee" they said instead.
  assert.deepEqual(
    replaced.words.filter((x) => x.error !== "None").map((x) => x.text),
    ["Kaffee"],
  );
  assert.equal(judge(replaced, t.id, "de-DE", t.reference), "practice");
  const unclear = scribeEvidence(
    response([
      w("Ich", -0.02),
      w("möchte", -1.2),
      w("einen", -0.05),
      w("Kaffee", -0.02),
      w("bestellen", -0.04),
    ]),
    t,
  );
  assert.equal(unclear.completeness, 100);
  assert.equal(judge(unclear, t.id, "de-DE", t.reference), "practice");
});
test("Scribe clarity never grades without per-word audio confidence, and free speech has no invented completeness", () => {
  const t = turnSchema.parse({
    id: crypto.randomUUID(),
    preferences: { version: 3, native: "es-MX", target: "de-DE" },
    reference: null,
  });
  const base = {
    text: "Guten Morgen",
    language_code: "deu",
    language_probability: 0.99,
  };
  for (const words of [
    [],
    [{ text: "Guten", type: "word" }],
    [{ text: "Guten", type: "word", logprob: null }],
    [{ text: "(Musik)", type: "audio_event", logprob: -0.1 }],
  ])
    assert.throws(
      () => scribeEvidence(parseScribe({ ...base, words }), t),
      /assessment-unavailable/,
    );
  const free = scribeEvidence(
    parseScribe({
      ...base,
      words: [
        { text: "Guten", type: "word", logprob: -0.03 },
        { text: "Morgen", type: "word", logprob: -0.05 },
      ],
    }),
    t,
  );
  assert.equal(free.mode, "unscripted");
  assert.equal(free.completeness, null);
  assert.equal(judge(free, t.id, "de-DE", null), "accepted");
});
test("a repetition of the phrase on screen is graded even if detected as native", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    { ...turn, reference },
    mock({
      transcribe: async () => ({
        text: reference.text,
        language: "es",
        confidence: 0.9,
      }),
    }),
    signal(),
  );
  assert.notEqual(result.outcome, "translation");
});

const scripted = (text: string) =>
  turnSchema.parse({
    id: crypto.randomUUID(),
    preferences: { version: 3, native: "es-MX", target: "de-DE" },
    reference: { id: crypto.randomUUID(), text, locale: "de-DE" },
  });
const said = (words: string, logprob = -0.02) =>
  parseScribe({
    text: words,
    language_code: "deu",
    language_probability: 0.99,
    words: words.split(" ").map((text) => ({ text, type: "word", logprob })),
  });
test("a clearly spoken phrase passes however the recognizer chose to spell it", () => {
  for (const [phrase, heard] of [
    ["Ich habe zwei Katzen.", "Ich habe 2 Katzen"],
    ["Ich habe 2 Katzen.", "Ich habe zwei Katzen"],
    ["Die Straße ist groß.", "Die Strasse ist gross"],
    ["Un café, por favor.", "Un cafe por favor"],
    ["Schreib mir eine E-Mail.", "Schreib mir eine E Mail"],
    ["L'ami est là.", "L' ami est la"],
    ["Ich weiß, dass das stimmt.", "Ich weiss das das stimmt"],
    ["Kaffee und/oder Tee.", "Kaffee und oder Tee"],
  ]) {
    const t = scripted(phrase);
    const e = scribeEvidence(said(heard), t);
    assert.equal(judge(e, t.id, "de-DE", t.reference), "accepted", phrase);
  }
});
test("hesitations, a repeated word or a polite extra do not fail a good repetition", () => {
  const t = scripted("Ich möchte einen Kaffee.");
  for (const heard of [
    "Ähm ich möchte einen Kaffee",
    "Ich möchte einen einen Kaffee",
    "Ich möchte einen Kaffee bitte",
    "Ich möchte einen Kaffee Ich möchte einen Kaffee",
  ]) {
    const e = scribeEvidence(said(heard), t);
    assert.equal(judge(e, t.id, "de-DE", t.reference), "accepted", heard);
    assert.ok(e.words.every((w) => t.reference!.text.includes(w.text)));
  }
});
test("one doubtful short word does not fail a sentence, a lost word does", () => {
  const t = scripted("Ich gehe heute in die Stadt.");
  const words = (unclear: number) =>
    parseScribe({
      text: "x",
      language_code: "deu",
      language_probability: 0.99,
      words: "Ich gehe heute in die Stadt".split(" ").map((text) => ({
        text,
        type: "word",
        logprob: text === "in" ? unclear : -0.03,
      })),
    });
  assert.equal(
    judge(scribeEvidence(words(-0.4), t), t.id, "de-DE", t.reference),
    "accepted",
  );
  assert.equal(
    judge(scribeEvidence(words(-1.5), t), t.id, "de-DE", t.reference),
    "practice",
  );
});
test("practice always names words of the phrase to work on", async () => {
  const t = scripted("Guten Morgen zusammen.");
  const run = (heard: ReturnType<typeof said>) =>
    runTurn(
      Buffer.alloc(1),
      t,
      mock({
        transcribe: async () => ({
          text: heard.text,
          language: "de",
          confidence: 0.99,
        }),
        assess: async (_audio, current) => scribeEvidence(heard, current),
      }),
      signal(),
    );
  const replaced = await run(said("Guten Abend zusammen"));
  assert.equal(replaced.outcome, "practice");
  assert.deepEqual(replaced.focus, ["Morgen"]);
  // Heard in full but none of it clearly: the weakest words are named.
  const mumbled = await run(said("Guten Morgen zusammen", -0.45));
  assert.equal(mumbled.outcome, "practice");
  assert.ok(mumbled.focus.length > 0);
});
test("with a phrase on screen, the turn goes where the learner meant", async () => {
  const outcome = async (
    phrase: string,
    text: string,
    language: string,
    confidence = 0.99,
  ) =>
    (
      await runTurn(
        Buffer.alloc(1),
        scripted(phrase),
        mock({
          transcribe: async () => ({ text, language, confidence }),
          assess: async (_audio, current) =>
            current.reference
              ? scribeEvidence(said(text), current)
              : evidence({ audioId: current.id, text }),
          generate: async (task) =>
            task === "translate" ? "Übersetzung" : "Antwort",
        }),
        signal(),
      )
    ).outcome;
  // A new sentence in the learner's language is translated even when it
  // shares a word, a name or a cognate with the phrase.
  assert.equal(
    await outcome("Nein, danke.", "No, gracias", "es"),
    "translation",
  );
  assert.equal(
    await outcome("Hotel", "Quiero ir al hotel en taxi", "es"),
    "translation",
  );
  assert.equal(
    await outcome(
      "Der Computer ist in Berlin.",
      "Mi computer no funciona en Berlin",
      "es",
    ),
    "translation",
  );
  // An accented attempt is graded even if the detector guessed Spanish.
  assert.notEqual(
    await outcome(
      "Ich möchte einen Kaffee bestellen.",
      "Ich möchte einen Kaffee bestellen",
      "es",
      0.6,
    ),
    "translation",
  );
  // A partial attempt in the target language is still an attempt.
  assert.equal(
    await outcome(
      "Ich möchte einen Kaffee bestellen.",
      "Ich möchte Kaffee",
      "de",
    ),
    "practice",
  );
  // Anything that is not clearly the learner's own language is an attempt:
  // a beginner must get help with the phrase, never a reply in a language
  // they do not speak yet.
  assert.equal(
    await outcome(
      "Ich möchte einen Kaffee bestellen.",
      "Wie spät ist es",
      "de",
    ),
    "practice",
  );
  assert.equal(
    await outcome(
      "Ich möchte einen Kaffee bestellen.",
      "Is mokte ain cafe",
      "es",
      0.55,
    ),
    "practice",
  );
});
test("asking to hear it again replays the phrase instead of translating the request", async () => {
  const t = scripted("Ich möchte einen Kaffee.");
  const result = await runTurn(
    Buffer.alloc(1),
    t,
    mock({
      transcribe: async () => ({
        text: "Repítelo, por favor.",
        language: "es",
        confidence: 0.99,
      }),
      generate: async () => {
        throw new Error("must not translate");
      },
    }),
    signal(),
  );
  assert.equal(result.outcome, "translation");
  assert.equal(result.reference?.id, t.reference!.id);
  assert.equal(result.text, "Ich möchte einen Kaffee.");
});
test("the detector's odd answers still route sensibly", () => {
  const to = (language: string, text = "Quiero un café") =>
    route({ text, language, confidence: 0.5 }, p, "auto");
  for (const code of ["es", "ES", "es-419", "cat", "glg"])
    assert.equal(to(code), "native", code);
  for (const code of ["de", "nl", "und", ""]) assert.equal(to(code), "target");
  assert.equal(to("es", "..."), "no-speech");
  assert.equal(to("es", "  "), "no-speech");
});
test("the text model's reply is reduced to the sentence without damaging it", () => {
  for (const [raw, clean] of [
    ['"Guten Morgen"', "Guten Morgen"],
    ["„Guten Morgen“", "Guten Morgen"],
    ["«Buenos días»", "Buenos días"],
    ["**Guten Morgen**", "Guten Morgen"],
    ["[laughs] Hallo", "Hallo"],
    ["Guten\nMorgen", "Guten Morgen"],
    ["Aspetta un po'", "Aspetta un po'"],
    ["Er sagte: „Komm her!“", "Er sagte: „Komm her!“"],
    ['"Stop!" he shouted', '"Stop!" he shouted'],
  ])
    assert.equal(cleanReply(raw), clean);
});
test("the same phrase counts once however it was punctuated, and only when accepted", async () => {
  const accepted = async (text: string, n: number) => {
    const t = {
      ...scripted(text),
      id: `${n}0112233-4455-4677-8899-aabbccddeeff`,
    };
    const result = await runTurn(
      Buffer.alloc(1),
      t,
      mock({
        transcribe: async () => ({ text, language: "de", confidence: 0.99 }),
        assess: async (_audio, current) =>
          scribeEvidence(said(text.replace(/[.!]/g, "")), current),
      }),
      signal(),
    );
    assert.equal(result.outcome, "accepted");
    return result;
  };
  let entries = addMastery(
    [],
    await accepted("Guten Morgen", 1),
    p,
    "2026-11-15",
  );
  entries = addMastery(
    entries,
    await accepted("Guten Morgen.", 2),
    p,
    "2026-11-15",
  );
  entries = addMastery(
    entries,
    await accepted("guten morgen!", 3),
    p,
    "2026-11-15",
  );
  assert.equal(countMastery(entries, p, "2026-11-15"), 1);
  const chat = await runTurn(Buffer.alloc(1), turn, mock(), signal());
  assert.equal(addMastery(entries, chat, p).length, entries.length);
  assert.equal(streak(entries, p, new Date(2026, 10, 15)), 1);
  assert.equal(streak(entries, p, new Date(2026, 10, 16)), 1);
  assert.equal(streak(entries, p, new Date(2026, 10, 18)), 0);
});

test("a failed attempt lists every word to work on, in order, for the guided practice", async () => {
  const t = scripted("Ich möchte bitte einen Kaffee mit Milch bestellen.");
  const heard = said("Is mokte ain cafe");
  const result = await runTurn(
    Buffer.alloc(1),
    t,
    mock({
      transcribe: async () => ({
        text: heard.text,
        language: "nl",
        confidence: 0.4,
      }),
      assess: async (_audio, current) => scribeEvidence(heard, current),
    }),
    signal(),
  );
  assert.equal(result.outcome, "practice");
  assert.deepEqual(result.weak, [
    "Ich",
    "möchte",
    "bitte",
    "einen",
    "Kaffee",
    "mit",
    "Milch",
    "bestellen",
  ]);
});
test("a word practised on its own passes when it is recognisable, and fails when it is another word", () => {
  for (const [word, heard, verdict] of [
    ["bestellen", "bestellen", "accepted"],
    ["bestellen", "bestelen", "accepted"],
    ["möchte", "Ähm mochte", "accepted"],
    ["Kaffee", "Kaffe", "accepted"],
    ["Milch", "Mich", "accepted"],
    ["bestellen", "Hallo", "practice"],
    ["Milch", "Kaffee", "practice"],
  ] as const) {
    const t = scripted(word);
    const e = scribeEvidence(said(heard, -0.3), t);
    assert.equal(judge(e, t.id, "de-DE", t.reference), verdict, heard);
  }
});
test("Pío's reply in conversation comes with its meaning in the learner's language", async () => {
  const result = await runTurn(
    Buffer.alloc(1),
    turn,
    mock({ generate: async () => "Gern! Mit Milch?\n¡Con gusto! ¿Con leche?" }),
    signal(),
  );
  assert.equal(result.text, "Gern! Mit Milch?");
  assert.equal(result.gloss, "¡Con gusto! ¿Con leche?");
});

test("a missed word practised alone comes with a listener's advice, and a correct one never waits for it", async () => {
  const t = scripted("möchte");
  const run = (heard: string, coach: Services["coach"]) =>
    runTurn(
      Buffer.alloc(1),
      { ...t, intent: "target" },
      mock({
        transcribe: async () => ({
          text: heard,
          language: "de",
          confidence: 0.9,
        }),
        assess: async (_audio, current) => scribeEvidence(said(heard), current),
        coach,
      }),
      signal(),
    );
  const missed = await run(
    "Hallo",
    async () => "La ö suena como e con labios redondos.",
  );
  assert.equal(missed.outcome, "practice");
  assert.equal(missed.tip, "La ö suena como e con labios redondos.");
  // A coach that fails or never answers must not break or delay the turn.
  assert.equal(
    (await run("Hallo", async () => Promise.reject(new Error("x")))).tip,
    "",
  );
  const passed = await run("möchte", () => new Promise(() => {}));
  assert.equal(passed.outcome, "accepted");
  assert.equal(passed.tip, undefined);
  // Whole phrases are never sent to the coach.
  const phrase = scripted("Guten Morgen zusammen.");
  let asked = false;
  await runTurn(
    Buffer.alloc(1),
    phrase,
    mock({
      assess: async (_audio, current) =>
        scribeEvidence(said("Guten Abend"), current),
      coach: async () => ((asked = true), "x"),
    }),
    signal(),
  );
  assert.equal(asked, false);
});

test("one missed word in an accented attempt is the only word practised", async () => {
  const t = scripted("Ich möchte bitte einen Kaffee mit Milch bestellen.");
  // Every word heard with an accent's doubt (clarity about 60), one replaced.
  const heard = said("Ich möchte bitte einen Kaffee mit Mils bestellen", -0.5);
  const result = await runTurn(
    Buffer.alloc(1),
    t,
    mock({
      transcribe: async () => ({
        text: heard.text,
        language: "de",
        confidence: 0.9,
      }),
      assess: async (_audio, current) => scribeEvidence(heard, current),
    }),
    signal(),
  );
  assert.equal(result.outcome, "practice");
  assert.deepEqual(result.weak, ["Milch"]);
  assert.deepEqual(result.focus, ["Milch"]);
});
