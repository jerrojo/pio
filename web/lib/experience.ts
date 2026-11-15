import { locales, type Locale, type Result } from "./domain.ts";

export type Phase =
  | "idle"
  | "permission"
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
export const connectionLabels: Record<Connection, string> = {
  checking: "Comprobando conexión",
  offline: "Sin conexión",
  access: "Acceso pendiente",
  unconfigured: "Voz por activar",
  ready: "Listo para practicar",
};
export const connectionCopy: Record<
  Exclude<Connection, "ready">,
  { title: string; description: string }
> = {
  checking: {
    title: "Despertando a Pío…",
    description: "Esto puede tardar unos segundos.",
  },
  offline: {
    title: "No pudimos conectar",
    description:
      "Revisa tu conexión y vuelve a intentarlo. Tus idiomas siguen guardados.",
  },
  access: {
    title: "Entra a tu práctica",
    description: "Usa tu código para abrir esta versión de Pío.",
  },
  unconfigured: {
    title: "Falta activar la voz",
    description:
      "La práctica por voz aún no está disponible para este idioma. Tus idiomas quedaron guardados; puedes comprobar de nuevo cuando se active.",
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
): Mood {
  if (phase === "listening") return "listening";
  if (phase === "permission") return "curious";
  if (phase === "thinking" || phase === "preparing-voice") return "thinking";
  if (phase === "speaking") return "speaking";
  if (connection === "checking") return "thinking";
  if (connection !== "ready") return "sleepy";
  if (outcome === "accepted") return "happy";
  if (outcome === "clarify") return "curious";
  return "idle";
}
export function sessionCopy(phase: Phase, outcome?: Result["outcome"]) {
  if (phase === "permission")
    return {
      title: "Déjame escucharte",
      description: "Dale permiso al micrófono en el aviso de tu navegador.",
    };
  if (phase === "listening")
    return {
      title: "Te escucho",
      description: "Habla con calma. Cuando hagas una pausa, sigo yo.",
    };
  if (phase === "thinking")
    return {
      title: "Déjame pensar…",
      description: "Un segundito.",
    };
  if (phase === "preparing-voice")
    return {
      title: "Ya casi…",
      description: "Estoy afinando la voz.",
    };
  if (phase === "speaking")
    return {
      title: "Escucha cómo suena",
      description: "Luego te toca a ti.",
    };
  const outcomes = {
    translation: {
      title: "¡Ahora dilo tú!",
      description: "Repite la frase completa. Te estoy escuchando.",
    },
    practice: {
      title: "¡Casi! Vamos otra vez",
      description: "Escucha las palabras marcadas y repite la frase completa.",
    },
    accepted: {
      title: "¡Bien dicho!",
      description: "Te salió muy bien. Dime otra cosa cuando quieras.",
    },
    conversation: {
      title: "Sigamos platicando",
      description: "Se te entendió bien. Contéstame en el idioma que aprendes.",
    },
    clarify: {
      title: "¿En qué idioma hablaste?",
      description:
        "Elige el idioma. Usaremos la misma grabación; no tienes que repetirla.",
    },
    unavailable: {
      title: "Probemos otra vez",
      description:
        "No pude evaluar la pronunciación con seguridad. No se guardó una calificación.",
    },
    "no-speech": {
      title: "No te escuché bien",
      description: "Acércate un poco al micrófono e inténtalo otra vez.",
    },
  };
  return outcome
    ? outcomes[outcome]
    : {
        title: "¿Qué quieres decir?",
        description: "Dilo en tu idioma y te enseño cómo se dice.",
      };
}
export const microphoneLabel = (phase: Phase) =>
  phase === "listening"
    ? "Terminar frase"
    : phase === "idle"
      ? "Hablar"
      : "Pausar";
