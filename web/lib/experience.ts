import { locales, type Locale, type Result } from "./domain.ts";
import { spanish, type Copy } from "./copy.ts";

export type Phase =
  | "idle"
  | "permission"
  // The microphone is opening: Pío is about to listen but is not yet.
  | "waking"
  | "listening"
  | "thinking"
  | "preparing-voice"
  | "speaking";
export type Status = { access: boolean; canSignIn: boolean; ready: Locale[] };
export function readStatus(value: unknown): Status {
  if (!value || typeof value !== "object") throw new Error("invalid-status");
  const s = value as Record<string, unknown>;
  if (
    typeof s.access !== "boolean" ||
    typeof s.canSignIn !== "boolean" ||
    !Array.isArray(s.ready) ||
    !s.ready.every((l) => locales.includes(l))
  )
    throw new Error("invalid-status");
  return {
    access: s.access,
    canSignIn: s.canSignIn,
    ready: s.ready as Locale[],
  };
}
export type Connection =
  "checking" | "offline" | "access" | "unconfigured" | "ready";
export function connectionState(
  status: Status | null,
  target: Locale,
  checking: boolean,
  failed: boolean,
): Connection {
  if (checking) return "checking";
  if (failed || !status) return "offline";
  if (!status.access && status.canSignIn) return "access";
  return status.access && status.ready.includes(target)
    ? "ready"
    : "unconfigured";
}
// Kept for callers that only know Spanish; the page reads `copy.connection`.
export const connectionCopy: Record<
  Exclude<Connection, "ready">,
  { title: string; description: string }
> = spanish.connection;
export type Mood =
  | "idle"
  | "curious"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  // After a miss: Pío cheers the learner on.
  | "cheer"
  | "sleepy";
// Pío's gesture. The live phase always wins over an old result, and Pío never
// celebrates or invites speech while practice is blocked.
export function mascotMood(
  phase: Phase,
  connection: Connection,
  outcome?: Result["outcome"],
  paused = false,
): Mood {
  if (phase === "listening") return "listening";
  if (phase === "permission") return "curious";
  if (phase === "preparing-voice" && outcome === "practice") return "cheer";
  if (phase === "thinking" || phase === "preparing-voice") return "thinking";
  if (phase === "speaking") return "speaking";
  if (connection === "checking") return "thinking";
  if (connection !== "ready") return "sleepy";
  if (phase === "waking") return "idle";
  if (paused) return "sleepy";
  if (outcome === "accepted") return "happy";
  if (outcome === "practice") return "cheer";
  return "idle";
}
export type Moment = {
  phase: Phase;
  outcome?: Result["outcome"];
  // The session stopped listening by itself or was paused by the learner.
  paused?: boolean;
  // The learner paused it on purpose, so Pío did not "wait" for anything.
  stopped?: boolean;
  // The last attempt could not be heard; the phrase on screen is unchanged.
  missed?: boolean;
  // Name of the language being learned, in lower case ("alemán").
  target?: string;
  // Words to work on after a failed repetition.
  focus?: number;
  // Reference words the learner left out.
  missing?: boolean;
  // Failed attempts in a row at the phrase on screen.
  tries?: number;
  streak?: number;
  // Guided practice: the word being worked on, its place, and whether Pío is
  // saying it again after a miss.
  drill?: {
    word: string;
    at: number;
    total: number;
    again: boolean;
    // Advice about the sound to fix, as a short sentence, when there is one.
    hint?: string;
    // What the word means in the learner's own language, when known.
    means?: string;
  } | null;
  // Every word has just been practised: time for the whole phrase.
  whole?: boolean;
};
// What Pío says about the moment, in the learner's language. It never claims
// to be listening unless the microphone is really open, and it always names
// the learner's next step.
export function sessionCopy(
  m: Moment,
  copy: Copy = spanish,
): { title: string; description: string } {
  const t = copy.session;
  const language = m.target || t.fallbackLanguage;
  const phrase = m.outcome === "translation" || m.outcome === "practice";
  if (m.phase === "permission") return t.permission;
  if (m.phase === "thinking") return t.thinking;
  if (m.drill) {
    const { at, total, again, hint, means } = m.drill;
    const word = copy.quote(m.drill.word),
      // The word and, in the learner's language, what it is.
      named = means ? `${word} (${means})` : word;
    const care = hint ? ` ${hint}` : "";
    const place = total > 1 ? ` ${t.place(at, total)}` : "";
    if (m.phase === "preparing-voice" || m.phase === "speaking")
      return {
        title: again ? t.again : t.parts,
        description: `${t.listenTo(named)}${again ? care : place}`,
      };
    if (m.phase === "listening")
      return {
        title: m.missed ? t.missed : t.hearing,
        // The advice stays in sight while the learner tries again.
        description: `${t.sayOnly(named)}${again ? care : ""}`,
      };
    return m.paused
      ? {
          title: m.stopped ? t.stopped : t.waiting,
          description: t.tapAndSay(word),
        }
      : { title: word, description: `${t.nowYouWord}${place}` };
  }
  if (m.whole && m.outcome === "practice" && !m.paused) {
    if (m.phase === "preparing-voice" || m.phase === "speaking")
      return t.wholeListen;
    if (m.phase !== "listening") return t.wholeSay;
  }
  if (m.phase === "preparing-voice" || m.phase === "speaking") {
    if (m.outcome === "practice")
      return {
        title: t.almost,
        description: m.missing
          ? t.missingBit
          : m.focus
            ? t.watchMarked
            : t.slower,
      };
    if (m.outcome === "conversation")
      return { title: t.replies, description: t.listenThenAnswer(language) };
    return m.phase === "speaking" || m.outcome ? t.howItSounds : t.tuning;
  }
  if (m.phase === "listening") {
    if (m.missed) return { title: t.missed, description: t.closer };
    if (phrase) return { title: t.hearing, description: t.repeat };
    if (m.outcome === "conversation")
      return { title: t.hearing, description: t.answerIn(language) };
    return { title: t.hearing, description: t.calm };
  }
  if (m.outcome === "accepted" && !m.paused) return t.accepted;
  if (m.paused && m.stopped)
    return {
      title: t.stopped,
      description: phrase ? t.stoppedPhrase : t.stoppedFree,
    };
  if (m.paused)
    return {
      title: t.waiting,
      description: phrase ? t.waitedPhrase : t.waitedFree,
    };
  if (m.outcome === "practice")
    return {
      title: t.onceMore,
      description: (m.tries || 0) >= 3 ? t.onceMoreMany : t.onceMoreCalm,
    };
  if (m.outcome === "translation") return t.nowYou;
  if (m.outcome === "conversation")
    return { title: t.keepTalking, description: t.answerIn(language) };
  return {
    title: t.ask,
    description:
      (m.streak || 0) >= 2 ? `${t.streak(m.streak!)} ${t.askHow}` : t.askHow,
  };
}
// The big button always names what a tap does right now.
export const microphoneLabel = (phase: Phase, copy: Copy = spanish) =>
  phase === "idle"
    ? copy.mic.speak
    : phase === "listening"
      ? copy.mic.done
      : phase === "speaking" || phase === "preparing-voice"
        ? copy.mic.myTurn
        : phase === "thinking"
          ? copy.mic.cancel
          : copy.mic.wait;
// Ideas for the first phrase, one per day.
export const examples = spanish.examples;

// Which words to practise one at a time after a phrase did not come through.
// Empty means: just say the phrase again.
export function toDrill(
  weak: string[],
  phrase: string,
  known: Set<string> | null,
  firstBlank: () => boolean,
) {
  const size = phrase.trim().split(/\s+/).length;
  if (size < 2 || !weak.length) return [];
  // More than half missing is closer to "nothing was heard" than to a slip.
  if (weak.length * 2 > size && firstBlank()) return [];
  return weak.filter((word) => !known?.has(word));
}

// The meaning of one word of a phrase, from the word-by-word meanings.
export function meaningOf(
  phrase: string | undefined,
  meanings: string[] | undefined,
  word: string,
) {
  if (!phrase || !meanings) return undefined;
  const clean = (w: string) =>
    w.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const at = phrase
    .trim()
    .split(/\s+/)
    .findIndex((w) => clean(w) === clean(word));
  return at < 0 ? undefined : meanings[at];
}
