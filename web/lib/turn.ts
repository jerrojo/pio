import {
  judge,
  route,
  type Evidence,
  type Locale,
  type Result,
  type Transcript,
  type Turn,
} from "./domain.ts";
export interface Services {
  transcribe(audio: Buffer, signal: AbortSignal): Promise<Transcript>;
  assess(audio: Buffer, turn: Turn, signal: AbortSignal): Promise<Evidence>;
  generate(
    task: "translate" | "converse",
    text: string,
    turn: Turn,
    signal: AbortSignal,
  ): Promise<string>;
}
export async function runTurn(
  audio: Buffer,
  turn: Turn,
  services: Services,
  signal: AbortSignal,
): Promise<Result> {
  signal.throwIfAborted();
  const transcript = await services.transcribe(audio, signal);
  if (transcript.text.length > 500) throw new Error("phrase-too-long");
  signal.throwIfAborted();
  const initial: Result = {
    id: turn.id,
    outcome: "no-speech",
    heard: transcript.text,
    text: "",
    reference: turn.reference,
    evidence: null,
    focus: [],
  };
  const intent = route(transcript, turn.preferences, turn.intent);
  if (intent === "no-speech" || intent === "clarify")
    return { ...initial, outcome: intent };
  if (intent === "native") {
    const text = (
      await services.generate("translate", transcript.text, turn, signal)
    ).trim();
    if (!text || text.length > 500) throw new Error("invalid-translation");
    signal.throwIfAborted();
    return {
      ...initial,
      outcome: "translation",
      text,
      reference: {
        id: crypto.randomUUID(),
        text,
        locale: turn.preferences.target,
      },
    };
  }
  const evidence = await services.assess(audio, turn, signal);
  signal.throwIfAborted();
  const decision = judge(
    evidence,
    turn.id,
    turn.preferences.target,
    turn.reference,
  );
  if (decision === "unavailable") return { ...initial, outcome: "unavailable" };
  if (decision === "practice")
    return {
      ...initial,
      outcome: "practice",
      text: turn.reference?.text || evidence.text,
      evidence,
      reference: turn.reference || {
        id: crypto.randomUUID(),
        text: evidence.text,
        locale: turn.preferences.target,
      },
      focus: evidence.words
        .filter(
          (w) =>
            w.accuracy < 70 ||
            ["Omission", "Mispronunciation", "Insertion"].includes(w.error),
        )
        .map((w) => w.text)
        .slice(0, 3),
    };
  if (turn.reference)
    return {
      ...initial,
      outcome: "accepted",
      text: turn.reference.text,
      evidence,
    };
  const text = await services.generate("converse", evidence.text, turn, signal);
  signal.throwIfAborted();
  return {
    ...initial,
    outcome: "conversation",
    heard: evidence.text,
    text,
    evidence,
    reference: null,
  };
}

const confirmations: Record<string, string> = {
  es: "Bien dicho. Podemos seguir.",
  en: "Well said. Let’s keep going.",
  de: "Gut gesagt. Machen wir weiter.",
  fr: "Bien dit. On continue.",
  it: "Ben detto. Continuiamo.",
  pt: "Muito bem. Vamos continuar.",
};
export function confirmation(locale: Locale) {
  return confirmations[locale.split("-")[0]];
}
