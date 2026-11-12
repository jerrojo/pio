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
test("an old result cannot override the current recording or playback instruction", () => {
  assert.equal(sessionCopy("listening", "accepted").title, "Te escucho");
  assert.equal(
    sessionCopy("preparing-voice", "practice").title,
    "Preparando la voz",
  );
  assert.equal(
    sessionCopy("speaking", "translation").title,
    "Escucha con calma",
  );
  assert.match(sessionCopy("idle", "practice").description, /frase completa/);
  assert.match(
    sessionCopy("idle", "unavailable").description,
    /No se guardó una calificación/,
  );
});
test("microphone action states expose speaking, finish and pause explicitly", () => {
  assert.equal(microphoneLabel("idle"), "Hablar");
  assert.equal(microphoneLabel("listening"), "Terminar frase");
  for (const phase of [
    "permission",
    "thinking",
    "preparing-voice",
    "speaking",
  ] as const)
    assert.equal(microphoneLabel(phase), "Pausar");
});
test("Pío's gesture follows the live phase and never celebrates or invites speech while practice is blocked", () => {
  assert.equal(mascotMood("listening", "ready", "accepted"), "listening");
  assert.equal(mascotMood("speaking", "ready", "practice"), "speaking");
  assert.equal(mascotMood("preparing-voice", "ready"), "thinking");
  assert.equal(mascotMood("permission", "ready"), "curious");
  assert.equal(mascotMood("idle", "ready", "accepted"), "happy");
  assert.equal(mascotMood("idle", "ready", "practice"), "idle");
  assert.equal(mascotMood("idle", "ready", "clarify"), "curious");
  assert.equal(mascotMood("idle", "checking", "accepted"), "thinking");
  for (const connection of ["offline", "access", "unconfigured"] as const) {
    assert.equal(mascotMood("idle", connection, "accepted"), "sleepy");
    assert.ok(connectionCopy[connection].title);
    assert.ok(connectionCopy[connection].description);
  }
});
