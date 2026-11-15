import { locales, type Locale, type Result } from "./domain.ts";

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
export const connectionCopy: Record<
  Exclude<Connection, "ready">,
  { title: string; description: string }
> = {
  checking: {
    title: "Despertando a Pío…",
    description: "Esto puede tardar unos segundos.",
  },
  offline: {
    title: "No logro conectarme",
    description:
      "Revisa tu internet y vuelve a intentar. Tus idiomas siguen guardados.",
  },
  access: {
    title: "¡Hola! Necesito tu código",
    description: "Escríbelo para empezar a practicar.",
  },
  unconfigured: {
    title: "Todavía no hablo ese idioma",
    description: "Elige otro idioma por ahora, arriba a la derecha.",
  },
};
export type Mood =
  | "idle"
  | "curious"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
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
  if (phase === "thinking" || phase === "preparing-voice") return "thinking";
  if (phase === "speaking") return "speaking";
  if (connection === "checking") return "thinking";
  if (connection !== "ready") return "sleepy";
  if (phase === "waking") return "idle";
  if (paused) return "sleepy";
  if (outcome === "accepted") return "happy";
  return "idle";
}
export type Moment = {
  phase: Phase;
  outcome?: Result["outcome"];
  // The session stopped listening by itself or was paused by the learner.
  paused?: boolean;
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
  } | null;
  // Every word has just been practised: time for the whole phrase.
  whole?: boolean;
};
// What Pío says about the moment. It never claims to be listening unless the
// microphone is really open, and it always names the learner's next step.
export function sessionCopy(m: Moment): { title: string; description: string } {
  const language = m.target || "el idioma que aprendes";
  const phrase = m.outcome === "translation" || m.outcome === "practice";
  if (m.phase === "permission")
    return {
      title: "Déjame escucharte",
      description: "Dale permiso al micrófono en el aviso de tu navegador.",
    };
  if (m.phase === "thinking")
    return { title: "Déjame pensar…", description: "Un segundito." };
  if (m.drill) {
    const { word, at, total, again, hint } = m.drill;
    const care = hint ? ` ${hint}` : "";
    const place = total > 1 ? ` Palabra ${at} de ${total}.` : "";
    if (m.phase === "preparing-voice" || m.phase === "speaking")
      return {
        title: again ? "Otra vez, despacito" : "Vamos por partes",
        description: `Escucha: «${word}».${again ? care : place}`,
      };
    if (m.phase === "listening")
      return {
        title: m.missed ? "No te alcancé a oír" : "Te escucho",
        description: `Di solo: «${word}».`,
      };
    return m.paused
      ? {
          title: "Aquí sigo",
          description: `Toca el micrófono y di: «${word}».`,
        }
      : { title: `«${word}»`, description: `Ahora dila tú.${place}` };
  }
  if (m.whole && m.outcome === "practice" && !m.paused) {
    if (m.phase === "preparing-voice" || m.phase === "speaking")
      return {
        title: "¡Ya las tienes!",
        description: "Escucha la frase completa una vez más.",
      };
    if (m.phase !== "listening")
      return {
        title: "¡Ahora completa!",
        description: "Ya dijiste bien cada palabra. Dila toda junta.",
      };
  }
  if (m.phase === "preparing-voice" || m.phase === "speaking") {
    if (m.outcome === "practice")
      return {
        title: "¡Casi! Escúchala otra vez",
        description: m.missing
          ? "Te faltó un pedacito. Luego dila completa."
          : m.focus
            ? "Fíjate en las palabras resaltadas."
            : "Luego dila un poco más despacio.",
      };
    if (m.outcome === "conversation")
      return {
        title: "Pío te contesta",
        description: `Escucha y luego contéstame en ${language}.`,
      };
    return m.phase === "speaking" || m.outcome
      ? { title: "Escucha cómo suena", description: "Luego te toca a ti." }
      : { title: "Ya casi…", description: "Estoy afinando la voz." };
  }
  if (m.phase === "listening") {
    if (m.missed)
      return {
        title: "No te alcancé a oír",
        description: "Dilo otra vez, un poquito más cerca del micrófono.",
      };
    if (phrase)
      return {
        title: "Te escucho",
        description: "Repite la frase. Si prefieres otra, dila en tu idioma.",
      };
    if (m.outcome === "conversation")
      return {
        title: "Te escucho",
        description: `Contéstame en ${language}. Si te atoras, dilo en tu idioma.`,
      };
    return {
      title: "Te escucho",
      description: "Habla con calma. Cuando hagas una pausa, sigo yo.",
    };
  }
  if (m.outcome === "accepted" && !m.paused)
    return {
      title: "¡Bien dicho!",
      description: "Se te entendió todo. Vamos por otra.",
    };
  if (m.paused)
    return {
      title: "Aquí sigo",
      description: phrase
        ? "Me quedé esperando. Toca el micrófono y repite la frase."
        : "Me quedé esperando. Toca el micrófono cuando quieras seguir.",
    };
  if (m.outcome === "practice")
    return {
      title: "Va de nuevo",
      description:
        (m.tries || 0) >= 3
          ? "Dila con calma. Si prefieres, toca «Otra frase»."
          : "Dila completa, con calma.",
    };
  if (m.outcome === "translation")
    return {
      title: "¡Ahora dilo tú!",
      description: "Repite la frase completa.",
    };
  if (m.outcome === "conversation")
    return {
      title: "Sigamos platicando",
      description: `Contéstame en ${language}. Si te atoras, dilo en tu idioma.`,
    };
  return {
    title: "¿Qué quieres decir?",
    description:
      (m.streak || 0) >= 2
        ? `Llevas ${m.streak} días seguidos. Dilo en tu idioma y te enseño cómo se dice.`
        : "Dilo en tu idioma y te enseño cómo se dice.",
  };
}
// The big button always names what a tap does right now.
export const microphoneLabel = (phase: Phase) =>
  phase === "idle"
    ? "Hablar"
    : phase === "listening"
      ? "Listo"
      : phase === "speaking" || phase === "preparing-voice"
        ? "Mi turno"
        : phase === "thinking"
          ? "Cancelar"
          : "Un momento…";
// Ideas for the first phrase, one per day.
export const examples = [
  "Quiero pedir un café, por favor",
  "¿Dónde está el baño?",
  "Mucho gusto, ¿cómo te llamas?",
  "La cuenta, por favor",
  "¿Cuánto cuesta esto?",
  "No entiendo, ¿puedes repetirlo?",
  "Buenos días, ¿cómo estás?",
];
