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
    voice = useRef<HTMLAudioElement | null>(null),
    audioUrl = useRef<string | null>(null),
    retained = useRef<Blob | null>(null),
    settings = useRef<HTMLDialogElement>(null),
    recording = useRef(false),
    startRef = useRef<() => void>(() => {});
  const captureContext = useRef<AudioContext | null>(null);
  const statusController = useRef<AbortController | null>(null);
  const lastIntent = useRef<Turn["intent"]>("auto");
  const lastPlayback = useRef("");
  // Microphone already granted: later turns skip the permission message.
  const granted = useRef(false);
  // Background noise level learned from earlier turns, for end-of-speech.
  const noiseFloor = useRef(0.004);
  // Consecutive turns where nothing usable was heard.
  const misses = useRef(0);
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
    // The session is continuous: after each turn Pío listens again by itself.
    if (resume) startRef.current();
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
      // Reuse the element unlocked by the user's tap so phones allow playback
      // that starts after a network round trip.
      const player = voice.current || new Audio();
      voice.current = player;
      player.onended = player.onerror = null;
      player.src = audioUrl.current;
      audio.current = player;
      player.playbackRate = slow ? 0.8 : 1;
      player.preservesPitch = true;
      player.onended = () => {
        if (token === epoch.current && audio.current === player) {
          audio.current = null;
          setPhase("idle");
          setTimeout(() => done(token, resume), 250);
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
      if (["translation", "practice", "conversation"].includes(next.outcome)) {
        misses.current = 0;
        await play(next.text, token, true);
      } else if (next.outcome === "accepted") {
        // Celebrate, then return to the clean starting state and listen again.
        misses.current = 0;
        chime();
        setPhase("idle");
        setTimeout(() => {
          if (token !== epoch.current) return;
          setResult(null);
          done(token);
        }, 2600);
      } else if (++misses.current < 2) {
        // Nothing usable was heard: listen again without making the user tap.
        done(token);
      } else {
        misses.current = 0;
        setPhase("idle");
      }
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
      // Silence simply pauses the session; a tap on Hablar resumes it.
      if (!heardSpeech || blob.size < 6444) {
        setPhase("idle");
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
  // Two rising notes when a phrase is accepted. Uses the audio context the
  // first tap already unlocked; silently skipped where it is unavailable.
  function chime() {
    const context = captureContext.current;
    if (!context || context.state !== "running") return;
    try {
      [659.25, 987.77].forEach((frequency, index) => {
        const at = context.currentTime + index * 0.13;
        const tone = context.createOscillator();
        const volume = context.createGain();
        tone.type = "sine";
        tone.frequency.value = frequency;
        volume.gain.setValueAtTime(0, at);
        volume.gain.linearRampToValueAtTime(0.16, at + 0.02);
        volume.gain.exponentialRampToValueAtTime(0.001, at + 0.42);
        tone.connect(volume).connect(context.destination);
        tone.start(at);
        tone.stop(at + 0.45);
      });
    } catch {}
  }
  // Phones only allow audio that starts inside a tap. Playing a silent clip on
  // the first tap unlocks the shared element for every later reply.
  function unlockVoice() {
    if (voice.current) return;
    const element = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=",
    );
    voice.current = element;
    void element.play().catch(() => {});
  }
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
    setPhase(granted.current ? "listening" : "permission");
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
      stopping = false,
      smooth = 0,
      voiced = 0,
      previous = 0,
      floor = noiseFloor.current;
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
        granted.current = true;
        setPhase("listening");
        setLevel(Math.min(1, rms * 12));
        setSeconds(Math.floor(time));
        // Speech is whatever rises clearly above the room's own noise, so a
        // fan or street noise cannot hold the microphone open.
        const step = time - previous;
        previous = time;
        smooth = smooth ? smooth * 0.6 + rms * 0.4 : rms;
        floor = Math.min(0.02, Math.max(0.002, Math.min(smooth, floor * 1.015)));
        noiseFloor.current = floor;
        if (smooth > Math.max(0.012, floor * 3)) {
          voiced += step;
          lastVoice = time;
          if (voiced >= 0.2) heard = true;
        }
        if (
          time >= 24.5 ||
          (!heard && time >= 8) ||
          (heard && time - lastVoice > 1.3)
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
      : phase === "listening" && reference.current
        ? {
            title: "Te escucho",
            description:
              "Repite la frase. Si prefieres otra, dila en tu idioma.",
          }
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
          <div className="topbar-tools">
            <span
              key={today}
              className={`chip progress ${today > 0 ? "earned" : ""}`}
              title="Frases logradas hoy en este navegador"
              aria-label={`${today} ${today === 1 ? "frase lograda" : "frases logradas"} hoy`}
            >
              <Icon name="star" size={16} />
              {today}
            </span>
            <button
              className="language-pill"
              onClick={openSettings}
              aria-label={`Cambiar idiomas. Ahora: ${names[preferences.native]} a ${names[preferences.target]}`}
            >
              <span>{names[preferences.native].split(" ·")[0]}</span>
              <Icon name="arrow" size={15} />
              <strong>{names[preferences.target].split(" ·")[0]}</strong>
            </button>
          </div>
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
              {result?.outcome === "accepted" && !active && (
                <div key={result.id} className="celebrate" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              )}
              {ready && !active && !result && !issue && (
                <p className="example">
                  Prueba con: <q>Quiero pedir un café, por favor</q>
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
                    style={{ "--level": level } as CSSProperties}
                    aria-label={microphoneLabel(phase)}
                    onClick={() => {
                      buzz(10);
                      unlockVoice();
                      if (phase === "listening") manualStop.current();
                      else if (active) cancel();
                      else void start();
                    }}
                  >
                    <span className="mic-ring" />
                    <Icon
                      name={active && phase !== "listening" ? "pause" : "mic"}
                      size={34}
                    />
                  </button>
                  <p className="dock-label" aria-hidden="true">
                    {microphoneLabel(phase)}
                  </p>
                  {!result && !active && (
                    <p className="dock-hint">
                      Toca una vez. Yo escucho, contesto y vuelvo a escuchar.
                    </p>
                  )}
                </div>
              )}
              {result && (
                <button className="text-button new-idea" onClick={reset}>
                  <Icon name="refresh" size={18} />
                  Nueva conversación
                </button>
              )}
              <details className="help-details">
                <summary>Ayuda y privacidad</summary>
                <ol>
                  <li>Di algo en tu idioma. Pío lo traduce y te lo dice.</li>
                  <li>Repítelo. Pío te ayuda hasta que salga bien.</li>
                  <li>
                    Si hablas en el idioma que aprendes, Pío te contesta y
                    conversan.
                  </li>
                </ol>
                <p>
                  El micrófono se enciende al tocar Hablar y vuelve a encenderse
                  solo entre turnos. Pausar, quedarte en silencio o salir de
                  esta pestaña lo apaga.
                </p>
                <p>
                  Tu audio se envía a ElevenLabs para transcribir y evaluar qué
                  tan claro se entendió cada palabra; el texto se envía a OpenAI
                  para traducir o conversar. Pío conserva temporalmente la
                  última grabación en memoria para que puedas reintentar; no se
                  guarda en una base de datos. Tus idiomas y frases logradas se
                  guardan solo en este navegador.
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
