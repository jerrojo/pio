"use client";
// Only mounted by the development-only /qa route. No audio or provider requests.
import { useState } from "react";
import { PhraseCard } from "./PhraseCard";
import { Mascot } from "./Icons";
import { sessionCopy, type Mood, type Phase } from "../lib/experience";
import type { Outcome, Result } from "../lib/domain";
const fixture = (outcome: Outcome, text: string, focus: string[]): Result => ({
  id: `visual-${outcome}`,
  outcome,
  heard: "Quisiera reservar una mesa para mañana por la noche.",
  text,
  reference: null,
  evidence: null,
  focus,
});
const moods: Mood[] = [
  "idle",
  "curious",
  "listening",
  "thinking",
  "speaking",
  "happy",
  "sleepy",
];
export function PracticePreview() {
  const [slow, setSlow] = useState(false),
    [played, setPlayed] = useState("");
  const long = fixture(
    "practice",
    "Ich würde gern für morgen Abend einen Tisch am Fenster reservieren, wenn das möglich ist. Außerdem möchte ich wissen, ob Sie auch vegetarische Gerichte anbieten.",
    ["würde", "vegetarische", "Sehenswürdigkeiten"],
  );
  const cards = [
    long,
    fixture("translation", "Ich möchte einen Kaffee bestellen.", []),
    fixture("accepted", "Ich möchte einen Kaffee bestellen.", []),
    fixture("conversation", "Gern! Mit Milch oder ohne?", []),
  ];
  return (
    <div className="app-shell">
      <main className="conversation">
        <p className="notice">
          PRUEBA VISUAL · Texto de ejemplo, sin evaluación ni voz real.
        </p>
        <h1>Vamos paso a paso</h1>
        <div className="bubble mine">
          <span className="bubble-label">Dijiste</span>
          <p>{long.heard}</p>
        </div>
        {cards.map((card) => (
          <PhraseCard
            key={card.id}
            result={card}
            locale="de-DE"
            disabled={false}
            slow={slow}
            onSlow={setSlow}
            onPlay={(text) => setPlayed(text)}
          />
        ))}
        <p role="status">
          {played ? `Acción de prueba: escuchar «${played}».` : ""}
        </p>
        <div className="qa-moods">
          {moods.map((mood) => (
            <figure key={mood}>
              <div className={`pio-orb ${mood}`}>
                <span className="pio-halo" />
                <div className="pio-nest">
                  <Mascot mood={mood} />
                </div>
              </div>
              <figcaption>{mood}</figcaption>
            </figure>
          ))}
        </div>
        <details className="help-details">
          <summary>Estados de la sesión</summary>
          {(
            [
              "permission",
              "listening",
              "thinking",
              "preparing-voice",
              "speaking",
            ] as Phase[]
          ).map((phase) => (
            <p key={phase}>
              <strong>{sessionCopy(phase).title}</strong> ·{" "}
              {sessionCopy(phase).description}
            </p>
          ))}
          {(
            [
              "translation",
              "practice",
              "accepted",
              "conversation",
              "clarify",
              "unavailable",
              "no-speech",
            ] as Outcome[]
          ).map((outcome) => (
            <p key={outcome}>
              <strong>{sessionCopy("idle", outcome).title}</strong> ·{" "}
              {sessionCopy("idle", outcome).description}
            </p>
          ))}
        </details>
      </main>
    </div>
  );
}
