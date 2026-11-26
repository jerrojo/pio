import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMastery,
  addPending,
  base,
  countMastery,
  hardToday,
  judge,
  locales,
  pendingFor,
  readMastery,
  readPreferences,
  readReview,
  route,
  streak,
  winPending,
  type Evidence,
  type Locale,
  type Outcome,
  type Preferences,
  type Result,
  type Turn,
} from "../lib/domain.ts";
import { copyFor } from "../lib/copy.ts";
import {
  mascotMood,
  meaningOf,
  microphoneLabel,
  sessionCopy,
  toDrill,
  type Phase,
} from "../lib/experience.ts";
import { parseTurn } from "../lib/schemas.ts";
import { runTurn, type Services } from "../lib/turn.ts";
import { encodeWav, validateWav } from "../lib/wav.ts";
import {
  canon,
  cleanReply,
  keysOf,
  likeness,
  nearWord,
  overlap,
  sameWord,
} from "../lib/words.ts";

// Thousands of made-up inputs per run, always the same ones: a failure can be
// reproduced by running the test again.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = seeded(20261125);
const int = (n: number) => Math.floor(rnd() * n);
const one = <T>(list: readonly T[]) => list[int(list.length)];
const alphabet = [
  ..."abcdefghijklmnopqrstuvwxyzäöüßñáéíóúçàèêâôõãœ",
  ..."ABCÄÖÜÑ",
  ..."      .,!?¿¡'’\"-–…«»",
  ..."0123456789",
  "\n",
  "\t",
  " ",
  "​",
  "か",
  "ü",
  "😀",
  "🇲🇽",
  "é",
  "İ",
  "ǆ",
  "\ud83d",
  "<b>",
  "${x}",
  "%s",
  "\\",
];
const text = (max = 40) =>
  Array.from({ length: int(max) }, () => one(alphabet)).join("");
const phrases = [
  "Ich möchte einen Kaffee bestellen.",
  "Guten Morgen, wie geht es dir?",
  "Où sont les toilettes ?",
  "Good morning, how are you?",
  "La cuenta, por favor",
  "Quanto custa isto?",
  "Dov'è il bagno?",
  "Ja.",
  "Kannst du mir bitte das Wasser rüberreichen, Schatz?",
];
const anything = (depth = 0): unknown => {
  const kind = int(depth > 2 ? 6 : 9);
  if (kind === 0) return null;
  if (kind === 1) return rnd() < 0.5;
  if (kind === 2) return one([0, -1, 1, 3, 1e9, NaN, Infinity, 0.5]);
  if (kind === 3) return text(12);
  if (kind === 4) return one(locales);
  if (kind === 5) return undefined;
  if (kind === 6)
    return Array.from({ length: int(4) }, () => anything(depth + 1));
  const keys = [
    "version",
    "native",
    "target",
    "text",
    "day",
    "days",
    "at",
    "id",
    "locale",
    "tries",
    "__proto__",
    "length",
  ];
  return Object.fromEntries(
    Array.from({ length: int(5) }, () => [one(keys), anything(depth + 1)]),
  );
};
const pairs: Preferences[] = [];
for (const native of locales)
  for (const target of locales)
    if (base(native) !== base(target))
      pairs.push({ version: 3, native, target });
const outcomes: (Outcome | undefined)[] = [
  undefined,
  "translation",
  "practice",
  "accepted",
  "conversation",
  "no-speech",
  "unavailable",
];
const phases: Phase[] = [
  "idle",
  "permission",
  "waking",
  "listening",
  "thinking",
  "preparing-voice",
  "speaking",
];
const flags = [undefined, false, true];

test("saved data of any shape never breaks the page", () => {
  for (let i = 0; i < 4000; i++) {
    const value = anything();
    const raw = rnd() < 0.2 ? text(60) : (JSON.stringify(value) ?? "undefined");
    const p = readPreferences(raw);
    if (p) {
      assert.equal(p.version, 3);
      assert.ok(locales.includes(p.native) && locales.includes(p.target));
      assert.notEqual(base(p.native), base(p.target));
    }
    const mastery = readMastery(raw);
    assert.ok(Array.isArray(mastery));
    const review = readReview(raw);
    assert.ok(Array.isArray(review));
    const pair = one(pairs);
    assert.ok(Number.isInteger(countMastery(mastery, pair)));
    assert.ok(Number.isInteger(streak(mastery, pair)));
    assert.ok(Array.isArray(pendingFor(review, pair)));
    assert.ok(Array.isArray(hardToday(review, pair)));
  }
});

test("progress only ever adds up, whatever is practised", () => {
  const attempt = (
    pair: Preferences,
    phrase: string,
    outcome: "accepted" | "practice",
  ): Result => {
    const id = crypto.randomUUID();
    const reference = {
      id: crypto.randomUUID(),
      text: phrase,
      locale: pair.target,
    };
    const words = phrase.split(/\s+/).filter(Boolean);
    return {
      id,
      outcome,
      heard: phrase,
      text: phrase,
      reference,
      focus: outcome === "practice" ? words.slice(0, 1) : [],
      evidence: {
        source: "scribe-clarity",
        audioId: id,
        referenceId: reference.id,
        locale: pair.target,
        mode: "scripted",
        text: phrase,
        accuracy: outcome === "accepted" ? 90 : 40,
        completeness: 100,
        words: (words.length ? words : ["x"]).map((text) => ({
          text,
          accuracy: outcome === "accepted" ? 90 : 40,
          error: "None",
        })),
      },
    };
  };
  let grew = 0;
  for (let round = 0; round < 60; round++) {
    const pair = one(pairs);
    let mastery = readMastery(null),
      review = readReview(null),
      last = 0;
    for (let i = 0; i < 80; i++) {
      const phrase = rnd() < 0.3 ? text(30) : one(phrases);
      const action = int(3);
      if (action === 0)
        mastery = addMastery(mastery, attempt(pair, phrase, "accepted"), pair);
      else if (action === 1)
        review = addPending(
          review,
          attempt(pair, phrase, "practice"),
          rnd() < 0.9 ? "proof" : undefined,
          pair,
        );
      else review = winPending(review, attempt(pair, phrase, "accepted"), pair);
      const now = countMastery(mastery, pair);
      assert.ok(now >= last, "the count of phrases never goes down");
      if (now > last) grew++;
      last = now;
      // What is kept can always be saved and read back the same.
      assert.deepEqual(readMastery(JSON.stringify(mastery)), mastery);
      assert.deepEqual(readReview(JSON.stringify(review)), review);
      assert.ok(review.length <= 40);
      assert.ok(JSON.stringify(mastery).length < 400000);
      // Nothing of another pair of languages is ever counted.
      const other = pairs.find(
        (q) => q.native !== pair.native && q.target !== pair.target,
      )!;
      assert.equal(countMastery(mastery, other), 0);
      assert.equal(pendingFor(review, other).length, 0);
    }
  }
  assert.ok(grew > 100, "accepted phrases are really counted");
});

test("Pío has something to say in every moment, in every language", () => {
  let checked = 0;
  for (const locale of locales) {
    const copy = copyFor(locale);
    for (const phase of phases) {
      assert.ok(microphoneLabel(phase, copy).length > 1);
      for (const outcome of outcomes)
        for (const paused of flags)
          for (const stopped of flags)
            for (const missed of flags)
              for (const whole of flags)
                for (const drill of [
                  undefined,
                  null,
                  { word: "Kaffee", at: 1, total: 1, again: false },
                  {
                    word: "Kaffee",
                    at: 2,
                    total: 3,
                    again: true,
                    hint: "h",
                    means: "café",
                  },
                ]) {
                  const said = sessionCopy(
                    {
                      phase,
                      outcome,
                      paused,
                      stopped,
                      missed,
                      whole,
                      drill,
                      target: rnd() < 0.5 ? "Deutsch" : undefined,
                      focus: int(3),
                      missing: rnd() < 0.5,
                      tries: int(5),
                      streak: int(5),
                    },
                    copy,
                  );
                  for (const line of [said.title, said.description]) {
                    assert.equal(typeof line, "string");
                    assert.ok(
                      line.trim().length > 1,
                      `${locale} ${phase} ${outcome}`,
                    );
                    assert.doesNotMatch(line, /undefined|null|NaN|\[object/);
                    assert.doesNotMatch(line, / {2}| \.$/);
                  }
                  // Pío never says it is listening while the microphone is off.
                  if (phase !== "listening")
                    assert.notEqual(said.title, copy.session.hearing);
                  checked++;
                }
      for (const outcome of outcomes)
        for (const paused of flags)
          for (const connection of [
            "checking",
            "offline",
            "access",
            "unconfigured",
            "ready",
          ] as const)
            assert.match(
              mascotMood(phase, connection, outcome, paused),
              /^(idle|curious|listening|thinking|speaking|happy|cheer|sleepy)$/,
            );
    }
  }
  assert.ok(checked > 50000);
});

test("word comparison survives any text and keeps its own rules", () => {
  for (let i = 0; i < 6000; i++) {
    const a = rnd() < 0.3 ? one(phrases) : text(),
      b = rnd() < 0.3 ? one(phrases) : text(),
      language = one(["", "de", "es", "fr", "en", "it", "pt", "xx"]);
    const key = canon(a, language);
    assert.equal(typeof key, "string");
    assert.equal(
      canon(key, language),
      key,
      `canon is stable for ${JSON.stringify(a)}`,
    );
    assert.ok(Array.isArray(keysOf(a, language)));
    const o = overlap(a, b, language),
      l = likeness(a, b, language);
    assert.ok(o >= 0 && o <= 1 && !Number.isNaN(o), `overlap ${o}`);
    assert.ok(l >= 0 && l <= 1 && !Number.isNaN(l), `likeness ${l}`);
    assert.equal(typeof sameWord(a, b), "boolean");
    assert.equal(typeof nearWord(a, b), "boolean");
    if (keysOf(a, language).length) {
      assert.equal(overlap(a, a, language), 1);
      assert.equal(likeness(a, a, language), 1);
    }
    assert.equal(typeof cleanReply(a), "string");
    assert.ok(cleanReply(a).length <= a.length);
    assert.ok(
      ["native", "target", "no-speech"].includes(
        route(
          {
            text: a,
            language: one(["es", "de", "en", "xx", ""]),
            confidence: rnd(),
          },
          one(pairs),
          one(["auto", "native", "target"]),
        ),
      ),
    );
  }
});

test("guided practice only ever asks for words of the phrase that failed", () => {
  for (let i = 0; i < 3000; i++) {
    const phrase = rnd() < 0.2 ? text(30) : one(phrases);
    const words = phrase.trim().split(/\s+/).filter(Boolean);
    const weak = words.filter(() => rnd() < 0.5);
    const known = rnd() < 0.5 ? new Set(words.filter(() => rnd() < 0.3)) : null;
    const todo = toDrill(weak, phrase, known, () => rnd() < 0.5);
    assert.ok(todo.every((w) => weak.includes(w)));
    assert.ok(todo.every((w) => !known?.has(w)));
    if (words.length < 2) assert.equal(todo.length, 0);
    const meanings = rnd() < 0.5 ? words.map((_, n) => "m" + n) : undefined;
    const found = meaningOf(phrase, meanings, one(words.length ? words : [""]));
    assert.ok(found === undefined || typeof found === "string");
    meaningOf(text(), [], text());
    meaningOf(undefined, meanings, text());
  }
});

test("whatever the browser sends is either a valid turn or refused", () => {
  const id = "00112233-4455-4677-8899-aabbccddeeff";
  for (let i = 0; i < 4000; i++) {
    const pair = one(pairs);
    const candidate: Record<string, unknown> = {
      id: rnd() < 0.8 ? id : anything(),
      preferences: rnd() < 0.7 ? pair : anything(),
      reference:
        rnd() < 0.4
          ? null
          : rnd() < 0.7
            ? {
                id,
                text: rnd() < 0.5 ? one(phrases) : text(600),
                locale: rnd() < 0.8 ? pair.target : one(locales),
              }
            : anything(),
      intent: rnd() < 0.8 ? one(["auto", "native", "target"]) : anything(),
      history:
        rnd() < 0.7
          ? Array.from({ length: int(10) }, () => ({
              role: one(["user", "assistant", "system"]),
              text: text(500),
            }))
          : anything(),
    };
    if (rnd() < 0.2) candidate.loose = anything();
    const turn = parseTurn(rnd() < 0.1 ? anything() : candidate);
    if (!turn) continue;
    assert.notEqual(
      base(turn.preferences.native),
      base(turn.preferences.target),
    );
    assert.ok(
      !turn.reference || turn.reference.locale === turn.preferences.target,
    );
    assert.ok(
      !turn.reference ||
        (turn.reference.text.length >= 1 &&
          [...turn.reference.text].length <= 500),
    );
    assert.ok(turn.history.length <= 8);
    assert.ok(
      turn.history.every(
        (h) =>
          ["user", "assistant"].includes(h.role) && // The limit counts characters as people see them, not storage units.
          [...h.text].length <= 400,
      ),
    );
  }
});

test("only what the page records counts as audio", () => {
  for (let i = 0; i < 300; i++) {
    const samples = new Float32Array(3200 + int(20000)).map(
      () => rnd() * 2 - 1,
    );
    const rate = one([16000, 44100, 48000, 22050, 8000, 96000]);
    const wav = Buffer.from(
      encodeWav([samples.slice(0, int(samples.length)), samples], rate),
    );
    if (wav.length >= 6444) validateWav(wav);
    // One damaged byte in the header, or a cut, is refused, never crashes.
    const damaged = Buffer.from(wav);
    damaged[int(44)] ^= 1 + int(255);
    for (const bad of [
      damaged,
      wav.subarray(0, int(wav.length)),
      Buffer.from(text(200)),
      Buffer.alloc(int(100)),
    ]) {
      try {
        validateWav(bad);
        assert.ok(bad.equals(wav) || bad.length >= 6444);
      } catch (error) {
        assert.equal((error as Error).message, "invalid-audio");
      }
    }
  }
});

test("a turn always ends in a known outcome, whatever the recognizer hears", async () => {
  const id = "00112233-4455-4677-8899-aabbccddeeff";
  const known = [
    "translation",
    "practice",
    "accepted",
    "conversation",
    "no-speech",
    "unavailable",
  ];
  const failures = [
    "provider-busy",
    "provider-timeout",
    "assessment-incomplete",
    "assessment-unavailable",
    "invalid-translation",
    "phrase-too-long",
    "provider-unavailable",
    "provider-quota",
  ];
  for (let i = 0; i < 2500; i++) {
    const preferences = one(pairs);
    const target = preferences.target;
    const phrase = one(phrases);
    const reference =
      rnd() < 0.6
        ? {
            id: "10112233-4455-4677-8899-aabbccddeeff",
            text: rnd() < 0.2 ? phrase.split(" ")[0] : phrase,
            locale: target,
          }
        : null;
    const heard =
      rnd() < 0.15
        ? ""
        : rnd() < 0.4
          ? phrase
          : rnd() < 0.5
            ? one(phrases)
            : text(50);
    const turn: Turn = {
      id,
      preferences,
      reference,
      intent: one(["auto", "native", "target"]),
      loose: rnd() < 0.3,
      history: [],
    };
    const words = (reference?.text || heard || "x")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({
        text: w,
        accuracy: int(101),
        error: one(["None", "None", "Mispronunciation", "Omission"]),
      }));
    const evidence: Evidence = {
      source: "scribe-clarity",
      audioId: id,
      referenceId: reference?.id ?? null,
      locale: target as Locale,
      mode: reference ? "scripted" : "unscripted",
      text: rnd() < 0.1 ? "" : heard || "x",
      accuracy: int(101),
      completeness: reference ? int(101) : null,
      words: rnd() < 0.1 ? [] : words,
    };
    const fail = (rate: number) => {
      if (rnd() < rate) throw new Error(one(failures));
    };
    const services: Services = {
      transcribe: async () => {
        fail(0.03);
        return {
          text: heard,
          language: one([
            base(preferences.native),
            base(target),
            "en",
            "it",
            "ja",
            "",
            "xx",
          ]),
          confidence: rnd(),
        };
      },
      assess: async () => {
        fail(0.05);
        return rnd() < 0.05
          ? ({ ...evidence, audioId: "other" } as Evidence)
          : evidence;
      },
      generate: async () => {
        fail(0.05);
        return rnd() < 0.05 ? "" : rnd() < 0.5 ? one(phrases) : text(80);
      },
      coach: async () => {
        fail(0.2);
        return rnd() < 0.5 ? text(60) : "";
      },
    };
    try {
      const result = await runTurn(
        Buffer.alloc(8000),
        turn,
        services,
        new AbortController().signal,
      );
      assert.ok(known.includes(result.outcome), result.outcome);
      assert.equal(result.id, id);
      assert.ok(Array.isArray(result.focus));
      if (result.outcome === "accepted" || result.outcome === "practice") {
        assert.ok(result.evidence, "a grade always carries its evidence");
        // A grade is only ever given against what the evidence says.
        assert.ok(
          ["accepted", "practice"].includes(
            judge(result.evidence!, id, target as Locale, result.reference),
          ),
        );
      }
      if (result.outcome === "practice") {
        const said = keysOf(result.text, base(target));
        for (const word of result.weak ?? [])
          assert.ok(
            keysOf(word, base(target)).every((k) => said.includes(k)),
            `"${word}" is not a word of "${result.text}"`,
          );
      }
      if (
        result.outcome === "translation" ||
        result.outcome === "conversation"
      ) {
        assert.ok(result.text.trim().length > 0);
        assert.ok(result.reference && result.reference.locale === target);
      }
      if (result.outcome === "no-speech") assert.equal(result.text, "");
      assert.doesNotMatch(JSON.stringify(result), /undefined|\[object/);
    } catch (error) {
      assert.ok(
        error instanceof Error && failures.includes(error.message),
        `unexpected failure: ${(error as Error).stack}`,
      );
    }
  }
});
