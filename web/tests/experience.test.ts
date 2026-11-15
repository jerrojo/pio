import { test } from "node:test";
import assert from "node:assert/strict";
import {
  connectionState,
  readStatus,
  sessionCopy,
  microphoneLabel,
  mascotMood,
  connectionCopy,
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
  assert.equal(mascotMood("idle", "ready", "practice"), "idle");
  assert.equal(mascotMood("idle", "ready", "translation", true), "sleepy");
  assert.equal(mascotMood("waking", "ready", "accepted"), "idle");
  assert.equal(mascotMood("idle", "checking", "accepted"), "thinking");
  for (const connection of ["offline", "access", "unconfigured"] as const) {
    assert.equal(mascotMood("idle", connection, "accepted"), "sleepy");
    assert.ok(connectionCopy[connection].title);
    assert.ok(connectionCopy[connection].description);
  }
});
