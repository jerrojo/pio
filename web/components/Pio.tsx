"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  addMastery,
  countMastery,
  names,
  preferenceKey,
  progressKey,
  readMastery,
  readPreferences,
  type Mastered,
  type Preferences,
  type Reference,
  type Result,
  type Turn,
} from "../lib/domain";
import { Recorder } from "../lib/recorder";
import { Icon, Mascot } from "./Icons";
import { LanguageForm } from "./LanguageForm";

import { PhraseCard } from "./PhraseCard";
import {
  connectionState,
  connectionCopy,
  connectionLabels,
  mascotMood,
  microphoneLabel,
  readStatus,
  sessionCopy,
  type Phase,
  type Status,
} from "../lib/experience";
const errorText: Record<string, string> = {
  "phrase-too-long":
    "Probemos con una frase más corta para poder corregirla completa.",
  NotAllowedError:
    "No se activó el micrófono. Permite su uso en tu navegador y vuelve a intentarlo.",
  NotFoundError:
    "No encontramos un micrófono. Conecta uno y vuelve a intentarlo.",
  NotReadableError:
    "El micrófono está ocupado. Cierra la otra aplicación que lo está usando.",
  "unsupported-microphone":
    "Abre Pío en un navegador actualizado con acceso seguro al micrófono.",
  "not-configured":
    "La voz aún no está activada para este idioma. Tu selección quedó guardada.",
  "provider-busy": "La voz está ocupada por un momento. Inténtalo de nuevo.",
  "assessment-incomplete":
    "No pude evaluar toda la frase. Probemos de nuevo con una frase más corta.",
  "assessment-unavailable":
    "No pude evaluar la pronunciación con seguridad. Repite cuando estés listo.",
  "access-required": "Vuelve a entrar con tu código para continuar.",
  "too-many-requests":
    "Hagamos una pausa breve. Puedes volver a intentarlo en un minuto.",
  "invalid-audio": "La grabación no llegó completa. Inténtalo de nuevo.",
};
function message(error: unknown) {
  if (error instanceof Error)
    return (
      errorText[error.name] ||
      errorText[error.message] ||
      "No pude completar este turno. Tu frase sigue aquí; puedes volver a intentarlo."
    );
  return "No pude completar este turno. Inténtalo de nuevo.";
}
// Second feedback channel for touch devices; silently absent elsewhere.
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
async function checked(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.code || "service-unavailable");
  }
  return response;
}

export function Pio() {
  const [loaded, setLoaded] = useState(false),
    [preferences, setPreferences] = useState<Preferences | null>(null),
    [status, setStatus] = useState<Status | null>(null),
    [checkingStatus, setCheckingStatus] = useState(true),
    [statusFailed, setStatusFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle"),
    [result, setResult] = useState<Result | null>(null),
    [issue, setIssue] = useState(""),
    [notice, setNotice] = useState(""),
    [level, setLevel] = useState(0),
    [seconds, setSeconds] = useState(0);
  const [entries, setEntries] = useState<Mastered[]>([]),
    [handsFree, setHandsFree] = useState(true),
    [slow, setSlow] = useState(false),
    [settingsRevision, setSettingsRevision] = useState(0),
    [recovery, setRecovery] = useState<"record" | "submit" | "play" | null>(
      null,
    );
  const reference = useRef<Reference | null>(null),
    history = useRef<Turn["history"]>([]),
    epoch = useRef(0),
    recorder = useRef<Recorder | null>(null),
    controller = useRef<AbortController | null>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    audioUrl = useRef<string | null>(null),
    retained = useRef<Blob | null>(null),
    settings = useRef<HTMLDialogElement>(null),
    automatic = useRef(false),
    recording = useRef(false),
    startRef = useRef<() => void>(() => {});
  automatic.current = handsFree;
  const captureContext = useRef<AudioContext | null>(null);
  const statusController = useRef<AbortController | null>(null);
  const lastIntent = useRef<Turn["intent"]>("auto");
  const lastPlayback = useRef("");
  async function refreshStatus() {
    statusController.current?.abort();
    const control = new AbortController();
    statusController.current = control;
    setCheckingStatus(true);
    setStatusFailed(false);
    try {
      const response = await checked(
        await fetch("/api/status", {
          cache: "no-store",
          signal: AbortSignal.any([control.signal, AbortSignal.timeout(8000)]),
        }),
      );
      const next = readStatus(await response.json());
      if (!control.signal.aborted) setStatus(next);
    } catch {
      if (!control.signal.aborted) setStatusFailed(true);
    } finally {
      if (!control.signal.aborted) setCheckingStatus(false);
    }
  }
  useEffect(() => {
    try {
      setPreferences(readPreferences(localStorage.getItem(preferenceKey)));
      setEntries(readMastery(localStorage.getItem(progressKey)));
    } catch {
      setNotice(
        "Este navegador no permite guardar tus preferencias. Se mantendrán durante esta visita.",
      );
    }
    setLoaded(true);
    void refreshStatus();
    return () => {
      epoch.current++;
      controller.current?.abort();
      statusController.current?.abort();
      recorder.current?.cancel();
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      void captureContext.current?.close();
    };
  }, []);
  function cancel() {
    epoch.current++;
    recording.current = false;
    controller.current?.abort();
    recorder.current?.cancel();
    recorder.current = null;
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setPhase("idle");
    setLevel(0);
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        automatic.current = false;
        setHandsFree(false);
        cancel();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === preferenceKey) {
        reset();
        setPreferences(readPreferences(event.newValue));
      }
      if (event.key === progressKey) setEntries(readMastery(event.newValue));
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function reset() {
    cancel();
    reference.current = null;
    history.current = [];
    retained.current = null;
    lastPlayback.current = "";
    setRecovery(null);
    setResult(null);
    setIssue("");
  }
  function save(p: Preferences) {
    reset();
    setPreferences(p);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(p));
    } catch {
      setNotice("No pudimos guardar tu selección para la próxima visita.");
    }
    settings.current?.close();
  }
  function openSettings() {
    cancel();
    setSettingsRevision((v) => v + 1);
    settings.current?.showModal();
  }
  function done(token: number, resume = true) {
    if (token !== epoch.current) return;
    setPhase("idle");
    if (resume && automatic.current) startRef.current();
  }
  async function play(text: string, token = epoch.current, resume = false) {
    if (!preferences) return;
    lastPlayback.current = text;
    setRecovery(null);
    setPhase("preparing-voice");
    setIssue("");
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    audio.current?.pause();
    audio.current = null;
    try {
      const response = await checked(
        await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, locale: preferences.target }),
          signal: AbortSignal.any([control.signal, AbortSignal.timeout(30000)]),
        }),
      );
      const blob = await response.blob();
      if (token !== epoch.current || control.signal.aborted) return;
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(blob);
      const player = new Audio(audioUrl.current);
      audio.current = player;
      player.playbackRate = slow ? 0.8 : 1;
      player.preservesPitch = true;
      player.onended = () => {
        if (token === epoch.current && audio.current === player) {
          audio.current = null;
          done(token, resume);
        }
      };
      setPhase("speaking");
      player.onerror = () => {
        if (token === epoch.current) {
          setPhase("idle");
          setIssue("No se pudo reproducir la voz. Tu frase sigue aquí.");
          setRecovery("play");
        }
      };
      try {
        await player.play();
      } catch {
        if (token === epoch.current) {
          setPhase("idle");
          setIssue("Activa el audio en este navegador para escuchar la frase.");
          setRecovery("play");
        }
      }
    } catch (error) {
      if (token === epoch.current && !control.signal.aborted) {
        setPhase("idle");
        setIssue(message(error));
        setRecovery("play");
      }
    }
  }
  async function submit(blob: Blob, intent: Turn["intent"], token: number) {
    if (!preferences || token !== epoch.current) return;
    retained.current = blob;
    lastIntent.current = intent;
    setRecovery(null);
    setPhase("thinking");
    setIssue("");
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    const id = crypto.randomUUID();
    const form = new FormData();
    form.set("audio", blob, "turn.wav");
    form.set(
      "turn",
      JSON.stringify({
        id,
        preferences,
        reference: reference.current,
        intent,
        history: history.current,
      }),
    );
    try {
      const response = await checked(
        await fetch("/api/turn", {
          method: "POST",
          body: form,
          signal: AbortSignal.any([control.signal, AbortSignal.timeout(75000)]),
        }),
      );
      const next = (await response.json()) as Result;
      if (token !== epoch.current || next.id !== id) return;
      setResult(next);
      if (next.outcome === "accepted") buzz([12, 60, 18]);
      reference.current = ["accepted", "conversation"].includes(next.outcome)
        ? null
        : next.reference;
      if (next.outcome === "accepted" || next.outcome === "conversation") {
        let current = entries;
        try {
          current = readMastery(localStorage.getItem(progressKey));
        } catch {}
        const updated = addMastery(current, next, preferences);
        setEntries(updated);
        try {
          localStorage.setItem(progressKey, JSON.stringify(updated));
        } catch {
          setNotice(
            "Tu frase fue correcta, pero no pudimos guardar el progreso en este navegador.",
          );
        }
      }
      if (next.outcome === "conversation")
        history.current = [
          ...history.current,
          { role: "user", text: next.heard },
          { role: "assistant", text: next.text },
        ].slice(-8) as Turn["history"];
      if (["translation", "practice", "conversation"].includes(next.outcome))
        await play(next.text, token, true);
      else if (next.outcome === "accepted") done(token);
      else setPhase("idle");
    } catch (error) {
      if (token === epoch.current && !control.signal.aborted) {
        setPhase("idle");
        setIssue(message(error));
        setRecovery("submit");
      }
    }
  }
  async function finish(token: number, heardSpeech: boolean) {
    if (!recording.current || token !== epoch.current) return;
    recording.current = false;
    const capture = recorder.current;
    setPhase("thinking");
    setLevel(0);
    try {
      const blob = await capture!.finish();
      if (token !== epoch.current) return;
      if (!heardSpeech || blob.size < 6444) {
        setPhase("idle");
        setIssue(
          "No alcancé a escucharte. Acerca el micrófono y vuelve a hablar.",
        );
        setRecovery("record");
        return;
      }
      await submit(blob, "auto", token);
    } catch (error) {
      if (token === epoch.current) {
        setPhase("idle");
        setIssue(message(error));
        setRecovery("record");
      }
    }
  }
  const manualStop = useRef<() => void>(() => {});
  async function start() {
    if (
      !preferences ||
      !status?.access ||
      !status.ready.includes(preferences.target)
    )
      return;
    cancel();
    const token = epoch.current;
    setIssue("");
    setRecovery(null);
    setSeconds(0);
    setPhase("permission");
    if (!window.AudioContext) {
      setPhase("idle");
      setIssue(errorText["unsupported-microphone"]);
      setRecovery("record");
      return;
    }
    try {
      if (!captureContext.current || captureContext.current.state === "closed")
        captureContext.current = new AudioContext();
    } catch {
      setPhase("idle");
      setIssue(errorText["unsupported-microphone"]);
      setRecovery("record");
      return;
    }
    const capture = new Recorder(captureContext.current);
    recorder.current = capture;
    let heard = false,
      lastVoice = 0,
      stopping = false;
    manualStop.current = () => {
      if (!stopping) {
        stopping = true;
        void finish(token, heard);
      }
    };
    recording.current = true;
    try {
      await capture.start((rms, time) => {
        if (token !== epoch.current || stopping) return;
        setPhase("listening");
        setLevel(Math.min(1, rms * 12));
        setSeconds(Math.floor(time));
        if (rms > 0.008) {
          heard = true;
          lastVoice = time;
        }
        if (
          time >= 24.5 ||
          (!heard && time >= 8) ||
          (heard && time - lastVoice > 1.6)
        )
          manualStop.current();
      });
      if (token !== epoch.current) capture.cancel();
    } catch (error) {
      if (token === epoch.current) {
        recording.current = false;
        setPhase("idle");
        setIssue(message(error));
        setRecovery("record");
      }
    }
  }
  startRef.current = () => {
    void start();
  };
  const connection = preferences
    ? connectionState(status, preferences.target, checkingStatus, statusFailed)
    : "checking";
  const ready = !!preferences && connection === "ready";
  const active = phase !== "idle";
  const mood = mascotMood(phase, connection, result?.outcome);
  const { title, description } =
    connection !== "ready" && !active
      ? connectionCopy[connection]
      : sessionCopy(phase, result?.outcome);
  const today = preferences ? countMastery(entries, preferences) : 0;
  function retry() {
    if (recovery === "submit" && retained.current)
      void submit(retained.current, lastIntent.current, epoch.current);
    else if (recovery === "play" && lastPlayback.current)
      void play(lastPlayback.current);
    else void start();
  }
  if (!loaded)
    return (
      <main className="loading">
        <div className="pio-orb thinking">
          <div className="pio-nest">
            <Mascot mood="thinking" />
          </div>
        </div>
        <p>Preparando Pío…</p>
      </main>
    );
  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="brand">
          <span className="brand-mark">
            <Mascot mood="still" />
          </span>
          pío
        </p>
        {preferences && (
          <button
            className="language-pill"
            onClick={openSettings}
            aria-label={`Cambiar idiomas. Ahora: ${names[preferences.native]} a ${names[preferences.target]}`}
          >
            <span>{names[preferences.native].split(" ·")[0]}</span>
            <Icon name="arrow" size={15} />
            <strong>{names[preferences.target].split(" ·")[0]}</strong>
            <Icon name="settings" size={17} />
          </button>
        )}
      </header>
      <main>
        {!preferences ? (
          <section className="welcome">
            <div className="pio-orb idle" aria-hidden="true">
              <span className="pio-halo" />
              <div className="pio-nest">
                <Mascot mood="idle" />
              </div>
            </div>
            <h1>
              Hola, soy <em>Pío</em>
            </h1>
            <p className="intro">
              Aprende un idioma hablando, una frase a la vez.
            </p>
            <ol className="steps">
              <li>Di algo en tu idioma.</li>
              <li>Escucha cómo se dice y repítelo.</li>
              <li>Te ayudo a pulirlo, sin prisa.</li>
            </ol>
            <div className="setup-card">
              <h2>Elige tus idiomas</h2>
              <LanguageForm saved={null} onSave={save} />
            </div>
          </section>
        ) : (
          <>
            <div className="session-meta">
              <span className={`chip ${ready ? "ready" : ""}`}>
                <span className="status-dot" />
                {connectionLabels[connection]}
              </span>
              <span
                className={`chip progress ${today > 0 ? "earned" : ""}`}
                title="Frases logradas hoy en este navegador"
              >
                <Icon name="star" size={16} />
                {today} {today === 1 ? "frase" : "frases"} hoy
              </span>
            </div>
            <section className="conversation" aria-labelledby="session-title">
              <div
                className={`pio-orb ${mood}`}
                style={{ "--level": level } as CSSProperties}
                aria-hidden="true"
              >
                <span className="pio-halo" />
                <div className="pio-nest">
                  <Mascot mood={mood} />
                </div>
              </div>
              <div
                className="session-copy"
                aria-live="polite"
                aria-atomic="true"
              >
                <h1 id="session-title">{title}</h1>
                <p>{description}</p>
              </div>
              {phase === "listening" && (
                <p className="recording-time" role="timer" aria-live="off">
                  <span className="rec-dot" />
                  Grabando · {seconds}s
                </p>
              )}
              {ready && !active && !result && !issue && (
                <p className="example">
                  Por ejemplo: <q>Quiero pedir un café, por favor</q>
                </p>
              )}
              {result?.heard && (
                <div className="bubble mine">
                  <span className="bubble-label">Dijiste</span>
                  <p>{result.heard}</p>
                </div>
              )}
              {result?.text && (
                <PhraseCard
                  result={result}
                  locale={preferences.target}
                  disabled={!ready || active}
                  slow={slow}
                  onSlow={setSlow}
                  onPlay={(text) => {
                    void play(text);
                  }}
                />
              )}
              {result?.outcome === "clarify" && (
                <div className="clarify">
                  {(["native", "target"] as const).map((intent) => (
                    <button
                      key={intent}
                      className="secondary"
                      disabled={active}
                      onClick={() => {
                        if (retained.current)
                          void submit(retained.current, intent, epoch.current);
                      }}
                    >
                      {names[preferences[intent]]}
                    </button>
                  ))}
                </div>
              )}
              {issue && (
                <div className="notice error" role="alert">
                  <p>{issue}</p>
                  {recovery && ready && (
                    <button
                      className="secondary"
                      disabled={active}
                      onClick={retry}
                    >
                      {recovery === "submit"
                        ? "Reintentar envío"
                        : recovery === "play"
                          ? "Volver a escuchar"
                          : "Intentar de nuevo"}
                    </button>
                  )}
                </div>
              )}
              {connection !== "ready" &&
                (connection === "access" ? (
                  <div className="connection-action">
                    <AccessForm onSuccess={refreshStatus} />
                  </div>
                ) : (
                  <div className="connection-action">
                    <button
                      className="secondary"
                      aria-disabled={checkingStatus}
                      aria-busy={checkingStatus}
                      onClick={() => {
                        if (!checkingStatus) void refreshStatus();
                      }}
                    >
                      <Icon name="refresh" size={18} />
                      {checkingStatus ? "Comprobando…" : "Comprobar de nuevo"}
                    </button>
                  </div>
                ))}
              {(ready || active) && (
                <div className="dock">
                  <button
                    className={`mic-button ${phase}`}
                    onClick={() => {
                      buzz(10);
                      if (phase === "listening") manualStop.current();
                      else if (active) cancel();
                      else void start();
                    }}
                  >
                    <span className="mic-icon">
                      <Icon
                        name={active && phase !== "listening" ? "pause" : "mic"}
                        size={24}
                      />
                    </span>
                    {microphoneLabel(phase)}
                  </button>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      role="switch"
                      className="switch"
                      checked={handsFree}
                      onChange={(e) => setHandsFree(e.target.checked)}
                    />
                    Continuar escuchando entre turnos
                  </label>
                </div>
              )}
              {result && (
                <button className="text-button new-idea" onClick={reset}>
                  <Icon name="refresh" size={18} />
                  Nueva conversación
                </button>
              )}
              <details className="help-details">
                <summary>Cómo practicar</summary>
                <ol>
                  <li>Habla en tu idioma. Pío traduce y te dice la frase.</li>
                  <li>
                    Repite la traducción. Recibirás ayuda hasta decirla de forma
                    aceptable.
                  </li>
                  <li>
                    Si hablas directamente en el idioma que aprendes, Pío
                    corrige la pronunciación o sigue la conversación.
                  </li>
                </ol>
                <p>
                  Los idiomas y las frases logradas se guardan en este
                  navegador. Una nueva conversación conserva esa selección y tu
                  progreso.
                </p>
              </details>
              <details className="help-details">
                <summary>Tu micrófono y privacidad</summary>
                <p>
                  El micrófono se activa al tocar Hablar. Si activas «Continuar
                  escuchando», vuelve a encenderse entre turnos. Pausar o salir
                  de esta pestaña lo apaga. Escuchar una frase o palabra con su
                  botón no lo enciende.
                </p>
                <p>
                  Tu audio se envía a ElevenLabs y Microsoft para transcribir y
                  evaluar; el texto se envía a OpenAI para traducir o conversar.
                  Pío conserva temporalmente la última grabación en memoria para
                  que puedas reintentar. Se descarta al cambiar idiomas, iniciar
                  una nueva conversación o cerrar la página; no se guarda en una
                  base de datos. La retención de cada proveedor depende de la
                  cuenta configurada.
                </p>
              </details>
            </section>
          </>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </main>
      <footer>
        <span>Una frase a la vez.</span>
        <span>Pío · Aprende hablando</span>
      </footer>
      <dialog
        ref={settings}
        className="settings-dialog"
        aria-labelledby="settings-title"
      >
        <div className="dialog-heading">
          <h2 id="settings-title">Tus idiomas</h2>
          <button
            aria-label="Cerrar idiomas"
            onClick={() => settings.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        {preferences && (
          <LanguageForm
            key={`${preferences.native}:${preferences.target}:${settingsRevision}`}
            saved={preferences}
            onSave={save}
          />
        )}
      </dialog>
    </div>
  );
}
function AccessForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  const errorId = useId();
  return (
    <form
      className="access-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const form = e.currentTarget;
        const code = new FormData(form).get("code");
        try {
          const response = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error();
          form.reset();
          setIssue("");
          await onSuccess();
        } catch {
          setIssue(
            "No pudimos abrir tu sesión. Revisa tu código o espera un minuto.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Código de acceso
        <input
          type="password"
          name="code"
          autoComplete="current-password"
          aria-invalid={!!issue || undefined}
          aria-describedby={issue ? errorId : undefined}
          maxLength={200}
          required
        />
      </label>
      <button className="secondary" aria-disabled={busy} aria-busy={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      {issue && (
        <p id={errorId} role="alert">
          {issue}
        </p>
      )}
    </form>
  );
}
