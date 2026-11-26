import { test } from "node:test";
import assert from "node:assert/strict";
import {
  browserLocale,
  copyFor,
  languageIn,
  languageName,
  ownName,
} from "../lib/copy.ts";
import { locales } from "../lib/domain.ts";
import {
  connectionState,
  readStatus,
  sessionCopy,
  microphoneLabel,
  mascotMood,
  connectionCopy,
  toDrill,
  meaningOf,
  type Status,
} from "../lib/experience.ts";

test("status accepts supported locales and rejects malformed responses instead of leaving a stuck loader", () => {
  assert.deepEqual(
    readStatus({ access: true, canSignIn: false, ready: ["de-DE", "fr-FR"] }),
    { access: true, canSignIn: false, ready: ["de-DE", "fr-FR"] },
  );
  for (const value of [
    null,
    {},
    { access: "yes", canSignIn: false, ready: [] },
    { access: true, canSignIn: false, ready: null },
    { access: true, canSignIn: false, ready: ["zz-ZZ"] },
  ])
    assert.throws(() => readStatus(value));
});
test("connection follows the selected language and distinguishes loading, failure, access and activation", () => {
  const s: Status = { access: true, canSignIn: true, ready: ["fr-FR"] };
  assert.equal(connectionState(s, "fr-FR", false, false), "ready");
  assert.equal(connectionState(s, "de-DE", false, false), "unconfigured");
  assert.equal(connectionState(s, "fr-FR", true, false), "checking");
  assert.equal(connectionState(s, "fr-FR", false, true), "offline");
  assert.equal(connectionState(null, "fr-FR", false, false), "offline");
  assert.equal(
    connectionState({ ...s, access: false }, "fr-FR", false, false),
    "access",
  );
  assert.equal(
    connectionState(
      { ...s, access: false, canSignIn: false },
      "fr-FR",
      false,
      false,
    ),
    "unconfigured",
  );
});
test("Pío only says it is listening while the microphone is open, and names the next step", () => {
  assert.equal(
    sessionCopy({ phase: "listening", outcome: "accepted" }).title,
    "Te escucho",
  );
  // Opening the microphone or waiting after a phrase is not listening yet.
  for (const phase of ["waking", "idle"] as const)
    assert.doesNotMatch(
      JSON.stringify(sessionCopy({ phase, outcome: "translation" })),
      /escuch/i,
    );
  assert.equal(
    sessionCopy({ phase: "speaking", outcome: "translation" }).title,
    "Escucha cómo suena",
  );
  // A failed repetition is said as such while Pío repeats the phrase.
  assert.match(
    sessionCopy({ phase: "speaking", outcome: "practice", focus: 2 }).title,
    /Casi/,
  );
  assert.match(
    sessionCopy({ phase: "speaking", outcome: "practice", missing: true })
      .description,
    /faltó/,
  );
  // Paused is its own state, whatever was on screen.
  assert.equal(
    sessionCopy({ phase: "idle", outcome: "translation", paused: true }).title,
    "Aquí sigo",
  );
  assert.match(
    sessionCopy({ phase: "listening", outcome: "translation", missed: true })
      .title,
    /No te alcancé/,
  );
  assert.match(
    sessionCopy({ phase: "idle", outcome: "practice", tries: 3 }).description,
    /Otra frase/,
  );
  assert.match(sessionCopy({ phase: "idle", streak: 4 }).description, /4 días/);
});
test("the microphone button names what a tap does in every phase", () => {
  assert.equal(microphoneLabel("idle"), "Hablar");
  assert.equal(microphoneLabel("listening"), "Listo");
  assert.equal(microphoneLabel("thinking"), "Cancelar");
  // While Pío talks, one tap interrupts and listens straight away.
  for (const phase of ["preparing-voice", "speaking"] as const)
    assert.equal(microphoneLabel(phase), "Mi turno");
});
test("Pío's gesture follows the live phase and never celebrates or invites speech while practice is blocked", () => {
  assert.equal(mascotMood("listening", "ready", "accepted"), "listening");
  assert.equal(mascotMood("speaking", "ready", "practice"), "speaking");
  assert.equal(mascotMood("preparing-voice", "ready"), "thinking");
  assert.equal(mascotMood("permission", "ready"), "curious");
  assert.equal(mascotMood("idle", "ready", "accepted"), "happy");
  assert.equal(mascotMood("idle", "ready", "practice"), "cheer");
  assert.equal(mascotMood("preparing-voice", "ready", "practice"), "cheer");
  assert.equal(mascotMood("idle", "ready", "practice", true), "sleepy");
  assert.equal(mascotMood("idle", "ready", "translation", true), "sleepy");
  assert.equal(mascotMood("waking", "ready", "accepted"), "idle");
  assert.equal(mascotMood("idle", "checking", "accepted"), "thinking");
  for (const connection of ["offline", "access", "unconfigured"] as const) {
    assert.equal(mascotMood("idle", connection, "accepted"), "sleepy");
    assert.ok(connectionCopy[connection].title);
    assert.ok(connectionCopy[connection].description);
  }
});

test("words that already came through alone are not practised again, and a mostly lost phrase is first just said again", () => {
  const phrase = "Na dann, guten Morgen.";
  let blanks = 0;
  const first = () => blanks++ === 0;
  // The loop from a real session: "Na" passed alone, then failed in the phrase.
  assert.deepEqual(toDrill(["Na"], phrase, null, first), ["Na"]);
  assert.deepEqual(toDrill(["Na", "dann"], phrase, new Set(["Na"]), first), [
    "dann",
  ]);
  assert.deepEqual(
    toDrill(["Na", "dann"], phrase, new Set(["Na", "dann"]), first),
    [],
  );
  assert.equal(blanks, 0);
  // Four of five words missing: said again once, practised the second time.
  const lost = ["Du", "bist", "total", "Typ."];
  assert.deepEqual(toDrill(lost, "Du bist total mein Typ.", null, first), []);
  assert.deepEqual(toDrill(lost, "Du bist total mein Typ.", null, first), lost);
  assert.deepEqual(toDrill(["Hallo."], "Hallo.", null, first), []);
});

test("a pause the learner asked for is not described as Pío waiting, and one word is never spoken of as several", () => {
  const asked = sessionCopy({ phase: "idle", paused: true, stopped: true });
  assert.equal(asked.title, "En pausa");
  assert.doesNotMatch(asked.description, /esperando/);
  assert.equal(sessionCopy({ phase: "idle", paused: true }).title, "Aquí sigo");
  const whole = sessionCopy({
    phase: "speaking",
    outcome: "practice",
    whole: true,
  });
  assert.doesNotMatch(whole.title + whole.description, /\blas\b|cada palabra/);
  // The advice about a missed word stays in sight while the learner tries.
  assert.match(
    sessionCopy({
      phase: "listening",
      drill: {
        word: "Kaffee",
        at: 1,
        total: 1,
        again: true,
        hint: "La «ff» es corta.",
      },
    }).description,
    /La «ff» es corta\./,
  );
});

test("a word being practised is named with what it means, taken from the phrase's word-by-word meanings", () => {
  const phrase = "Ich möchte einen Kaffee bestellen.";
  const meanings = ["yo", "quisiera", "un", "café", "pedir"];
  assert.equal(meaningOf(phrase, meanings, "Kaffee"), "café");
  assert.equal(meaningOf(phrase, meanings, "bestellen"), "pedir");
  assert.equal(meaningOf(phrase, meanings, "Tee"), undefined);
  assert.equal(meaningOf(phrase, undefined, "Kaffee"), undefined);
  const drill = { word: "Kaffee", at: 1, total: 1, again: false };
  assert.match(
    sessionCopy({ phase: "speaking", drill: { ...drill, means: "café" } })
      .description,
    /«Kaffee» \(café\)/,
  );
  assert.match(
    sessionCopy({ phase: "listening", drill }).description,
    /Di solo: «Kaffee»\./,
  );
});

test("Pío speaks the learner's own language, and Spanish when it is unknown", () => {
  const english = copyFor("en-GB");
  assert.equal(
    sessionCopy({ phase: "listening" }, english).title,
    "I'm listening",
  );
  assert.equal(microphoneLabel("idle", copyFor("de-DE")), "Sprechen");
  assert.equal(copyFor("xx-XX"), copyFor("es-MX"));
  assert.equal(copyFor(null), copyFor("es-ES"));
  // A word being practised is quoted the way each language quotes.
  const drill = { word: "Kaffee", at: 1, total: 1, again: false };
  assert.equal(
    sessionCopy({ phase: "speaking", drill }, copyFor("fr-FR")).description,
    "Écoute : « Kaffee ».",
  );
});
test("every language says something for every moment", () => {
  for (const locale of locales) {
    const copy = copyFor(locale);
    assert.equal(copy.examples.length, 7);
    assert.equal(copy.welcome.steps.length, 3);
    assert.equal(copy.help.steps.length, 4);
    assert.deepEqual(
      Object.keys(copy.errors).sort(),
      Object.keys(copyFor("es-MX").errors).sort(),
    );
  }
});
test("languages are named in the learner's language and in their own", () => {
  assert.equal(ownName("de-DE"), "Deutsch");
  assert.equal(ownName("es-MX"), "Español · México");
  assert.equal(ownName("pt-BR"), "Português · Brasil");
  assert.equal(languageName("de-DE", "es-MX"), "Alemán");
  assert.equal(languageIn("de-DE", "es-MX"), "alemán");
  assert.equal(languageIn("es-MX", "en-US"), "Spanish");
  assert.equal(languageName("en-GB", "fr-FR", true), "Anglais · Royaume-Uni");
});
test("the first visit starts in the browser's language when Pío knows it", () => {
  assert.equal(browserLocale(["fr-CA", "en-US"]), "fr-FR");
  assert.equal(browserLocale(["ja-JP", "en-GB"]), "en-GB");
  assert.equal(browserLocale(["ja-JP"]), "");
});
