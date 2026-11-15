import { canon, keysOf, overlap } from "./words.ts";
import {
  judge,
  route,
  type Evidence,
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
// "Say it again" in the learner's own language: replay the phrase on screen
// instead of translating the request.
const again =
  /^(repitelo|repitela|repite|repitemelo|otravez|denuevo|unavezmas|again|repeat|repeatit|repeatthat|onemoretime|sayitagain|saythatagain|nochmal|nocheinmal|encore|repete|ancora|ripeti|denovo|outravez|repita)(porfavor|porfa|please|bitte|sivousplait|perfavore)?$/;
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
  const said = route(transcript, turn.preferences, turn.intent);
  if (said === "no-speech") return initial;
  const ref = turn.reference,
    target = turn.preferences.target;
  // An attempt at the phrase on screen is graded whatever language the
  // detector guessed for a short accented clip. The bar is higher when the
  // detector is sure it heard the learner's own language, and for one- or
  // two-word phrases, where a shared word proves little.
  let intent: "native" | "target" | "repeat" = said;
  if (ref && turn.intent === "auto") {
    const size = keysOf(ref.text, target).length,
      heard = keysOf(transcript.text, target).length,
      share = overlap(transcript.text, ref.text, target),
      sureNative = said === "native" && transcript.confidence >= 0.9;
    const bar =
      said === "native"
        ? size < 3
          ? 1
          : sureNative
            ? 0.75
            : 0.5
        : size < 3
          ? 0.5
          : 0.3;
    if (share >= bar && heard <= size * 1.5 + 2) intent = "repeat";
  } else if (ref && said === "target") intent = "repeat";
  if (intent === "native" && ref && again.test(canon(transcript.text)))
    return { ...initial, outcome: "translation", text: ref.text };
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
  if (intent === "target") {
    // Free speech in the language being learned: Pío simply answers. The
    // learner's own sentence never becomes a model phrase to repeat.
    const free = { ...turn, reference: null };
    const evidence = await services.assess(audio, free, signal);
    signal.throwIfAborted();
    if (judge(evidence, turn.id, target, null) === "unavailable")
      return { ...initial, outcome: "unavailable" };
    const text = await services.generate(
      "converse",
      evidence.text,
      free,
      signal,
    );
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
  const evidence = await services.assess(audio, turn, signal);
  signal.throwIfAborted();
  const decision = judge(evidence, turn.id, target, ref);
  if (decision === "unavailable" || !ref)
    return { ...initial, outcome: "unavailable" };
  if (decision === "accepted")
    return { ...initial, outcome: "accepted", text: ref.text, evidence };
  // What to work on: missing words first, then the ones heard least clearly.
  const weak = evidence.words.filter(
    (w) => w.error !== "None" || w.accuracy < 70,
  );
  const focus = (
    weak.length
      ? weak
      : [...evidence.words].sort((a, b) => a.accuracy - b.accuracy).slice(0, 2)
  )
    .map((w) => w.text)
    .filter((word, at, all) => all.indexOf(word) === at)
    .slice(0, 3);
  return { ...initial, outcome: "practice", text: ref.text, evidence, focus };
}
