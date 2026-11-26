"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  addMastery,
  addPending,
  countMastery,
  hardToday,
  pendingFor,
  readReview,
  reviewKey,
  winPending,
  preferenceKey,
  progressKey,
  readMastery,
  readPreferences,
  streak,
  type Mastered,
  type Pending,
  type Preferences,
  type Reference,
  type Result,
  type Turn,
  type Locale,
} from "../lib/domain";
import { Recorder, releaseMic, warmMic } from "../lib/recorder";
import { Ear } from "../lib/ear";
import { anySignal } from "../lib/signal";
import { readTurn } from "../lib/turn-reply";
import { encodeWav } from "../lib/wav";
import { Icon, Mascot } from "./Icons";
import { LanguageForm } from "./LanguageForm";
import {
  browserLocale,
  copyFor,
  languageIn,
  languageName,
  type Copy,
} from "../lib/copy";

import { PhraseCard } from "./PhraseCard";
import {
  connectionState,
  mascotMood,
  microphoneLabel,
  readStatus,
  sessionCopy,
  type Phase,
  type Status,
  toDrill,
  meaningOf,
} from "../lib/experience";
// Everything is said by Pío, in the first person, without jargon.
function message(error: unknown, copy: Copy) {
  if (error instanceof Error)
    return copy.errors[error.message] || copy.errors[error.name] || copy.failed;
  return copy.failed;
}
// Errors where sending the same recording again cannot help.
const speakAgain = [
  "phrase-too-long",
  "assessment-incomplete",
  "assessment-unavailable",
  "invalid-audio",
  "invalid-input",
];
// Second feedback channel for touch devices; silently absent elsewhere.
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
async function checked(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // The firewall's own "slow down" (a 429 or a plain refusal) carries no
    // code of ours.
    throw new Error(
      body.code ||
        ([403, 429].includes(response.status)
          ? "too-many-requests"
          : "service-unavailable"),
    );
  }
  return response;
}
const statusKey = "pio.status.v1";
type Lock = { release(): Promise<void> };

export function Pio() {
  const [loaded, setLoaded] = useState(false),
    [preferences, setPreferences] = useState<Preferences | null>(null),
    [status, setStatus] = useState<Status | null>(null),
    [checkingStatus, setCheckingStatus] = useState(true),
    [statusFailed, setStatusFailed] = useState(false);
  // The language everything is written in: the learner's own. While the
  // language form is open it follows the choice being made there, and before
  // any choice it follows the browser.
  const [draft, setDraft] = useState<Locale | "">("");
  const ui =
    draft ||
    preferences?.native ||
    (loaded
      ? browserLocale(navigator.languages || [navigator.language])
      : "") ||
    "es-MX";
  const t = copyFor(ui);
  const say = useRef(t);
  useEffect(() => {
    say.current = t;
    document.documentElement.lang = ui;
  }, [t, ui]);
  const [phase, setPhase] = useState<Phase>("idle"),
    [result, setResult] = useState<Result | null>(null),
    [issue, setIssue] = useState(""),
    [notice, setNotice] = useState(""),
    // The session stopped listening and waits for a tap.
    [paused, setPaused] = useState(false),
    [stopped, setStopped] = useState(false),
    // What each word of a phrase means, by phrase, as it arrives.
    [glosses, setGlosses] = useState<Record<string, string[]>>({}),
    // The last attempt was not heard; the phrase on screen is unchanged.
    [missed, setMissed] = useState(false),
    // Failed attempts in a row at the phrase on screen.
    [tries, setTries] = useState(0),
    // Guided practice: the word on turn, for the screen.
    [step, setStep] = useState<{
      word: string;
      at: number;
      total: number;
      again: boolean;
      hint?: string;
    } | null>(null),
    // The words were just practised one by one; next comes the whole phrase.
    [whole, setWhole] = useState(false);
  // Guided practice: the words of the phrase that did not come through, the
  // one being worked on, and how many times it has been missed.
  // Weakest sound of each word in the last attempts, when the assessor names it.
  const hints = useRef(new Map<string, string>());
  const noteSounds = (reply: Result) => {
    for (const w of reply.evidence?.words || []) {
      const worst = [...(w.parts || [])].sort(
        (a, b) => a.accuracy - b.accuracy,
      )[0];
      if (worst && worst.accuracy < 60)
        hints.current.set(w.text, `Cuida el sonido «${worst.text}».`);
      else hints.current.delete(w.text);
    }
  };
  const drill = useRef<{ words: string[]; at: number; tries: number } | null>(
    null,
  );
  const [entries, setEntries] = useState<Mastered[]>([]),
    [review, setReview] = useState<Pending[]>([]),
    [slow, setSlow] = useState(false),
    [settingsRevision, setSettingsRevision] = useState(0),
    [recovery, setRecovery] = useState<"record" | "submit" | "play" | null>(
      null,
    );
  const reference = useRef<Reference | null>(null),
    loose = useRef(false),
    history = useRef<Turn["history"]>([]),
    epoch = useRef(0),
    live = useRef<Phase>("idle"),
    recorder = useRef<Recorder | null>(null),
    controller = useRef<AbortController | null>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    voice = useRef<HTMLAudioElement | null>(null),
    audioUrl = useRef<string | null>(null),
    retained = useRef<Blob | null>(null),
    settings = useRef<HTMLDialogElement>(null),
    recording = useRef(false),
    startRef = useRef<(auto?: boolean) => void>(() => {});
  const captureContext = useRef<AudioContext | null>(null);
  const statusController = useRef<AbortController | null>(null);
  const lastPlayback = useRef<{ text: string; word?: string } | null>(null);
  // Microphone already granted: later turns skip the permission message.
  const granted = useRef(false);
  // Background noise level learned from earlier turns, for end-of-speech.
  const noiseFloor = useRef(0.004);
  // Consecutive turns where nothing usable was heard.
  const misses = useRef(0);
  // Live listening: what Pío is hearing right now, and the permit for the
  // next turn, asked for while Pío is still speaking.
  const [hearing, setHearing] = useState("");
  const ear = useRef<Ear | null>(null);
  const permit = useRef<Promise<string | null> | null>(null);
  function askPermit() {
    return fetch("/api/ear", {
      method: "POST",
      signal: anySignal(6000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => (typeof body?.token === "string" ? body.token : null))
      .catch(() => null);
  }
  // Attempts at the current phrase of which nothing was understood.
  const blank = useRef(0);
  // Words of the phrase on turn that already came through alone: saying them
  // alone again teaches nothing, so they are not practised twice.
  const known = useRef<{ text: string; words: Set<string> }>({
    text: "",
    words: new Set(),
  });
  // How the last recording began: how long the microphone took to open and
  // when the voice started. Numbers only, to find cut-off beginnings.
  const micStat = useRef("");
  // Turns Pío started by itself since the learner last touched the screen or
  // got a phrase right. A room with a TV on must not keep a session going.
  const unattended = useRef(0);
  // Voices already generated in this visit: replays are instant and free.
  const voices = useRef(new Map<string, Blob>());
  // Server signatures of the phrases it produced, needed to ask for a voice.
  const proofs = useRef(new Map<string, string>());
  const warmed = useRef(false);
  const slowNow = useRef(false);
  const watchdog = useRef<ReturnType<typeof setInterval> | null>(null);
  const celebration = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awake = useRef<Lock | null>(null);
  const orb = useRef<HTMLDivElement>(null),
    mic = useRef<HTMLButtonElement>(null);
  const go = (next: Phase) => {
    live.current = next;
    setPhase(next);
  };
  // The voice level moves the orb and the button many times a second, so it
  // is written straight to the elements instead of re-rendering the screen.
  const showLevel = (value: number) => {
    for (const element of [orb.current, mic.current])
      element?.style.setProperty("--level", String(value));
  };
  async function refreshStatus(quiet = false) {
    statusController.current?.abort();
    const control = new AbortController();
    statusController.current = control;
    if (!quiet) {
      setCheckingStatus(true);
      setStatusFailed(false);
    }
    try {
      const response = await checked(
        await fetch("/api/status", {
          cache: "no-store",
          signal: anySignal(8000, control.signal),
        }),
      );
      const next = readStatus(await response.json());
      if (control.signal.aborted) return;
      setStatus(next);
      setStatusFailed(false);
      try {
        localStorage.setItem(statusKey, JSON.stringify(next));
      } catch {}
    } catch {
      if (!control.signal.aborted && !quiet) setStatusFailed(true);
    } finally {
      if (!control.signal.aborted) setCheckingStatus(false);
    }
  }
  useEffect(() => {
    let known = false;
    try {
      setPreferences(readPreferences(localStorage.getItem(preferenceKey)));
      setEntries(readMastery(localStorage.getItem(progressKey)));
      setReview(readReview(localStorage.getItem(reviewKey)));
      // The last known status shows the microphone at once on a return visit;
      // the real one is confirmed in the background.
      const cached = readStatus(
        JSON.parse(localStorage.getItem(statusKey) || "null"),
      );
      if (cached.access) {
        setStatus(cached);
        setCheckingStatus(false);
        known = true;
      }
    } catch {}
    setLoaded(true);
    void refreshStatus(known);
    const online = () => void refreshStatus(true);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      epoch.current++;
      controller.current?.abort();
      statusController.current?.abort();
      recorder.current?.cancel();
      releaseMic();
      audio.current?.pause();
      if (watchdog.current) clearInterval(watchdog.current);
      if (celebration.current) clearTimeout(celebration.current);
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      void captureContext.current?.close();
    };
  }, []);
  function cancel() {
    epoch.current++;
    recording.current = false;
    if (watchdog.current) clearInterval(watchdog.current);
    if (celebration.current) clearTimeout(celebration.current);
    watchdog.current = celebration.current = null;
    controller.current?.abort();
    ear.current?.close();
    ear.current = null;
    recorder.current?.cancel();
    recorder.current = null;
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    go("idle");
    showLevel(0);
  }
  // Stop everything and say so: Pío never looks like it is listening when the
  // microphone is off.
  function pause(byLearner = false) {
    cancel();
    releaseMic();
    setPaused(true);
    setStopped(byLearner);
  }
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    const changed = () => {
      // A reply already on its way is kept and shown on return; the
      // microphone and the voice stop as soon as the page is hidden.
      if (document.hidden && live.current !== "thinking") {
        if (live.current !== "idle") pauseRef.current();
      } else if (!document.hidden && live.current !== "idle") void stayAwake();
    };
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  // Nobody touches the screen in a hands-free session, so keep it on.
  async function stayAwake() {
    if (awake.current) return;
    try {
      const lock = await (
        navigator as Navigator & {
          wakeLock?: { request(type: "screen"): Promise<Lock> };
        }
      ).wakeLock?.request("screen");
      if (lock) awake.current = lock;
    } catch {}
  }
  useEffect(() => {
    if (phase !== "idle") void stayAwake();
    else {
      void awake.current?.release().catch(() => {});
      awake.current = null;
    }
  }, [phase]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === preferenceKey) {
        reset();
        setPreferences(readPreferences(event.newValue));
      }
      if (event.key === progressKey) setEntries(readMastery(event.newValue));
      if (event.key === reviewKey) setReview(readReview(event.newValue));
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function reset() {
    cancel();
    reference.current = null;
    loose.current = false;
    history.current = [];
    retained.current = null;
    drill.current = null;
    hints.current.clear();
    setStep(null);
    setWhole(false);
    voices.current.clear();
    proofs.current.clear();
    lastPlayback.current = null;
    misses.current = 0;
    setRecovery(null);
    setResult(null);
    setIssue("");
    setPaused(false);
    setMissed(false);
    setTries(0);
  }
  function save(p: Preferences) {
    settings.current?.close();
    setDraft("");
    if (p.native === preferences?.native && p.target === preferences?.target)
      return;
    reset();
    setPreferences(p);
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(p));
    } catch {
      setNotice(say.current.saveFailed);
    }
  }
  function openSettings() {
    if (live.current !== "idle") pause();
    setSettingsRevision((v) => v + 1);
    settings.current?.showModal();
  }
  function done(token: number, resume = true) {
    if (token !== epoch.current) return;
    // The session is continuous: after each turn Pío listens again by itself.
    if (resume && !document.hidden) startRef.current(true);
    else pause();
  }
  // Says a phrase the server produced, or one word of it.
  async function play(
    text: string,
    token = epoch.current,
    resume = false,
    ready?: Blob | null,
    word?: string,
  ) {
    if (!preferences) return;
    lastPlayback.current = { text, word };
    if (resume && !permit.current) permit.current = askPermit();
    setRecovery(null);
    setIssue("");
    setPaused(false);
    // Back from another app: show the reply, but do not talk to an empty room.
    if (document.hidden) {
      pause();
      return;
    }
    go("preparing-voice");
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    audio.current?.pause();
    audio.current = null;
    try {
      const key = word || text;
      let blob = ready || voices.current.get(key);
      if (!blob) {
        const response = await checked(
          await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              word,
              locale: preferences.target,
              proof: proofs.current.get(text) || "",
            }),
            signal: anySignal(25000, control.signal),
          }),
        );
        blob = await response.blob();
      }
      if (!voices.current.has(key) && voices.current.size >= 40)
        voices.current.delete(voices.current.keys().next().value as string);
      voices.current.set(key, blob);
      if (token !== epoch.current || control.signal.aborted) return;
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(blob);
      // Reuse the element unlocked by the user's tap so phones allow playback
      // that starts after a network round trip.
      const player = voice.current || new Audio();
      voice.current = player;
      player.onended =
        player.onerror =
        player.onpause =
        player.onplaying =
        player.ontimeupdate =
          null;
      player.src = audioUrl.current;
      audio.current = player;
      const pace = () => {
        // A word Pío repeats after a miss is said more slowly.
        player.defaultPlaybackRate = player.playbackRate =
          slowNow.current || (drill.current?.tries ?? 0) > 0 ? 0.8 : 1;
      };
      pace();
      player.preservesPitch = true;
      // Some browsers reset the speed when a new clip loads.
      player.onplaying = pace;
      const mine = () => token === epoch.current && audio.current === player;
      player.onended = () => {
        if (!mine()) return;
        audio.current = null;
        done(token, resume);
      };
      // Headphones pulled out, a call, the lock screen: the voice was stopped
      // from outside, so wait for the learner instead of hanging in "speaking".
      // Near the end of the phrase the microphone starts opening, so it is
      // already listening when the learner answers and no first word is lost.
      let warmed = false;
      const left = () =>
        Number.isFinite(player.duration)
          ? (player.duration - player.currentTime) / (player.playbackRate || 1)
          : Infinity;
      player.ontimeupdate = () => {
        if (warmed || !resume || !granted.current || !mine()) return;
        if (left() > 0.8) return;
        warmed = true;
        warmMic();
      };
      player.onpause = () => {
        if (!mine() || player.ended) return;
        // A phone may stop the last instant of the voice as the microphone
        // opens: that is the phrase ending, not an interruption.
        if (warmed && left() < 1.2) {
          audio.current = null;
          done(token, resume);
        } else pause();
      };
      player.onerror = () => {
        if (!mine()) return;
        voices.current.delete(key);
        pause();
        setIssue(say.current.voiceFailed);
        setRecovery("play");
      };
      go("speaking");
      try {
        await player.play();
      } catch {
        if (mine()) {
          pause();
          setIssue(say.current.soundBlocked);
          setRecovery("play");
        }
      }
    } catch (error) {
      if (token === epoch.current && !control.signal.aborted) {
        pause();
        setIssue(message(error, say.current));
        setRecovery("play");
      }
    }
  }
  // Asks once per phrase what each of its words means. It never holds the
  // turn up, and without an answer the phrase simply shows as before.
  const asked = useRef(new Set<string>());
  function explain(text: string) {
    const proof = proofs.current.get(text);
    if (!preferences || !text || !proof || asked.current.has(text)) return;
    asked.current.add(text);
    // An empty list holds the room under each word while the answer is on
    // its way, so the card does not grow under the learner's eyes.
    setGlosses((all) => ({ ...all, [text]: [] }));
    const failed = () => {
      asked.current.delete(text);
      setGlosses((all) => {
        const rest = { ...all };
        delete rest[text];
        return rest;
      });
    };
    void fetch("/api/gloss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        locale: preferences.target,
        native: preferences.native,
        proof,
      }),
      signal: anySignal(15000),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { words?: unknown } | null) => {
        const words = data?.words;
        if (
          Array.isArray(words) &&
          words.length === text.trim().split(/\s+/).length &&
          words.every((w) => typeof w === "string")
        )
          setGlosses((all) => ({ ...all, [text]: words as string[] }));
        else failed();
      })
      .catch(failed);
  }
  // Everything the session must remember about a reply is stored the moment
  // it arrives, so nothing is lost if the learner interrupts its voice.
  function keep(reply: Result) {
    if (!preferences) return;
    setResult(reply);
    setMissed(false);
    if (reply.voice) proofs.current.set(reply.text, reply.voice);
    explain(reply.text);
    // The phrase stays after it is said well, and Pío's own answers become
    // phrases too, so saying either again is graded, never answered.
    reference.current = reply.reference;
    loose.current = ["accepted", "conversation"].includes(reply.outcome);
    setTries((n) => (reply.outcome === "practice" ? n + 1 : 0));
    if (reply.outcome === "accepted") {
      unattended.current = 0;
      let current = entries;
      try {
        current = readMastery(localStorage.getItem(progressKey));
      } catch {}
      const updated = addMastery(current, reply, preferences);
      setEntries(updated);
      try {
        localStorage.setItem(progressKey, JSON.stringify(updated));
      } catch {}
    }
    // A phrase that needed help is remembered until it is said well.
    if (reply.outcome === "practice" || reply.outcome === "accepted") {
      let list = review;
      try {
        list = readReview(localStorage.getItem(reviewKey));
      } catch {}
      const next =
        reply.outcome === "practice"
          ? addPending(
              list,
              reply,
              reply.reference
                ? proofs.current.get(reply.reference.text)
                : undefined,
              preferences,
            )
          : winPending(list, reply, preferences);
      setReview(next);
      try {
        localStorage.setItem(reviewKey, JSON.stringify(next));
      } catch {}
    }
    if (reply.outcome === "conversation")
      history.current = [
        ...history.current,
        { role: "user" as const, text: reply.heard.slice(0, 400) },
        { role: "assistant" as const, text: reply.text.slice(0, 400) },
      ].slice(-8);
  }
  // Guided practice. Pío says the word on turn and listens for it.
  function sayWord(token: number) {
    const d = drill.current,
      phrase = reference.current;
    if (!d || !phrase) return Promise.resolve();
    setStep({
      word: d.words[d.at],
      at: d.at + 1,
      total: d.words.length,
      again: d.tries > 0,
      hint: hints.current.get(d.words[d.at]),
    });
    return play(phrase.text, token, true, null, d.words[d.at]);
  }
  // After an attempt at a word: on to the next one when it came through (or
  // after three misses, so nobody gets stuck), otherwise the same word again.
  // When every word is done, back to the whole phrase.
  function nextWord(token: number, passed: boolean) {
    const d = drill.current,
      phrase = reference.current;
    if (!d || !phrase) return Promise.resolve();
    if (passed) {
      buzz(12);
      chime([880]);
      if (known.current.text !== phrase.text)
        known.current = { text: phrase.text, words: new Set() };
      known.current.words.add(d.words[d.at]);
    }
    if (passed || d.tries >= 2) {
      d.at++;
      d.tries = 0;
    } else d.tries++;
    if (d.at < d.words.length) return sayWord(token);
    drill.current = null;
    setStep(null);
    setWhole(true);
    return play(phrase.text, token, true);
  }
  async function submit(blob: Blob, token: number) {
    if (!preferences || token !== epoch.current) return;
    retained.current = blob;
    setRecovery(null);
    go("thinking");
    setIssue("");
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    const id = crypto.randomUUID();
    // In guided practice the attempt is graded against the word on turn.
    const word = drill.current ? drill.current.words[drill.current.at] : null;
    const form = new FormData();
    form.set("audio", blob, "turn.wav");
    form.set("voice", "1");
    form.set(
      "turn",
      JSON.stringify({
        id,
        preferences,
        reference: word
          ? { id: crypto.randomUUID(), text: word, locale: preferences.target }
          : reference.current,
        intent: word ? "target" : "auto",
        loose: !word && loose.current,
        history: history.current,
      }),
    );
    const spoken = (r: Result) =>
      ["translation", "practice", "conversation"].includes(r.outcome);
    try {
      const response = await checked(
        await fetch("/api/turn", {
          method: "POST",
          body: form,
          headers: micStat.current ? { "x-pio-mic": micStat.current } : {},
          signal: anySignal(40000, control.signal),
        }),
      );
      const got: { result: Result | null } = { result: null };
      let ready: Blob | null = null;
      try {
        ready = await readTurn(response, (reply) => {
          if (token !== epoch.current || reply.id !== id) return;
          got.result = reply;
          // A word being practised keeps its phrase on screen, unless the
          // learner said something new instead.
          if (!reply.text || (word && reply.outcome !== "translation")) return;
          if (word) {
            drill.current = null;
            setStep(null);
          }
          // Show the phrase the moment it arrives, while its voice downloads.
          keep(reply);
          if (spoken(reply)) go("preparing-voice");
        });
      } catch (error) {
        // The connection dropped after the reply arrived: keep the reply and
        // ask for its voice separately instead of losing the turn.
        if (!got.result) throw error;
      }
      const next = got.result;
      if (!next || token !== epoch.current) return;
      let again: string[] = [];
      retained.current = null;
      noteSounds(next);
      if (!word && next.outcome !== "practice") blank.current = 0;
      // A listener's advice about the word just missed wins over a bare score.
      if (word && next.tip) hints.current.set(word, next.tip);
      if (
        word &&
        (next.outcome === "accepted" || next.outcome === "practice")
      ) {
        misses.current = 0;
        setMissed(false);
        await nextWord(token, next.outcome === "accepted");
      } else if (
        next.outcome === "practice" &&
        (again = toDrill(
          next.weak ?? [],
          next.text,
          known.current.text === next.text ? known.current.words : null,
          // Most of the phrase did not come through: that can be a cut-off
          // start or a noise, so the first time Pío just says it again.
          () => blank.current++ === 0,
        )).length
      ) {
        // The phrase did not come through: work on exactly the words that
        // failed, one at a time, before trying the whole phrase again.
        misses.current = 0;
        drill.current = { words: again, at: 0, tries: 0 };
        setWhole(false);
        await sayWord(token);
      } else if (spoken(next)) {
        misses.current = 0;
        setWhole(false);
        await play(next.text, token, true, ready);
      } else if (next.outcome === "accepted") {
        // Celebrate, then return to the clean starting state and listen again.
        misses.current = 0;
        buzz([12, 60, 18]);
        chime();
        go("idle");
        celebration.current = setTimeout(() => {
          if (token !== epoch.current) return;
          setResult(null);
          done(token);
        }, 2600);
      } else {
        // Nothing usable was heard. Whatever is on screen stays; Pío listens
        // once more by itself and then waits.
        setMissed(true);
        if (++misses.current < 2) done(token);
        else {
          misses.current = 0;
          pause();
        }
      }
    } catch (error) {
      if (token !== epoch.current || control.signal.aborted) return;
      const code = error instanceof Error ? error.message : "";
      pause();
      setIssue(message(error, say.current));
      if (code === "access-required") void refreshStatus(true);
      setRecovery(
        code === "too-many-requests" || code === "access-required"
          ? null
          : speakAgain.includes(code)
            ? "record"
            : "submit",
      );
    }
  }
  async function finish(token: number, heardSpeech: boolean) {
    if (!recording.current || token !== epoch.current) return;
    recording.current = false;
    if (watchdog.current) clearInterval(watchdog.current);
    watchdog.current = null;
    const capture = recorder.current;
    // Tapped before the microphone opened, or nothing was said: just wait.
    if (!capture?.started || !heardSpeech) {
      pause();
      return;
    }
    go("thinking");
    showLevel(0);
    try {
      const blob = await capture.finish();
      if (token !== epoch.current) return;
      if (blob.size < 6444) {
        pause();
        return;
      }
      // Somebody is clearly there: only turns nobody answers count towards
      // pausing by itself.
      unattended.current = 0;
      await submit(blob, token);
    } catch (error) {
      if (token === epoch.current) {
        pause();
        setIssue(message(error, say.current));
        setRecovery("record");
      }
    }
  }
  const manualStop = useRef<() => void>(() => {});
  // Two rising notes when a phrase is accepted. Uses the audio context the
  // first tap already unlocked; silently skipped where it is unavailable.
  function chime(notes = [659.25, 987.77]) {
    const context = captureContext.current;
    if (!context || context.state !== "running") return;
    try {
      notes.forEach((frequency, index) => {
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
  // Phones only allow audio that starts inside a tap. Playing a short silent
  // clip on the first tap unlocks the shared element for every later reply.
  function unlockVoice() {
    if (voice.current) return;
    try {
      const silence = URL.createObjectURL(
        new Blob([encodeWav([new Float32Array(1600)], 16000)], {
          type: "audio/wav",
        }),
      );
      const element = new Audio(silence);
      voice.current = element;
      void element.play().catch(() => {});
    } catch {}
  }
  async function start(auto = false) {
    if (
      !preferences ||
      !status?.access ||
      !status.ready.includes(preferences.target)
    )
      return;
    cancel();
    if (!auto) unattended.current = misses.current = 0;
    else if (++unattended.current > 12) {
      unattended.current = 0;
      pause();
      return;
    }
    const token = epoch.current;
    setIssue("");
    setRecovery(null);
    setPaused(false);
    // A celebrated phrase leaves the screen when the next turn begins.
    setResult((shown) => (shown?.outcome === "accepted" ? null : shown));
    go(granted.current ? "waking" : "permission");
    // Wake the turn endpoint while the user is still speaking the first phrase.
    if (!warmed.current) {
      warmed.current = true;
      void fetch("/api/turn", { method: "HEAD" }).catch(() => {});
    }
    const fail = (error: unknown) => {
      if (token !== epoch.current) return;
      if (
        error instanceof Error &&
        ["NotAllowedError", "NotFoundError"].includes(error.name)
      )
        granted.current = false;
      pause();
      setIssue(message(error, say.current));
      setRecovery("record");
    };
    try {
      if (!window.AudioContext) throw new Error("unsupported-microphone");
      if (!captureContext.current || captureContext.current.state === "closed")
        captureContext.current = new AudioContext();
    } catch {
      fail(new Error("unsupported-microphone"));
      return;
    }
    const capture = new Recorder(captureContext.current);
    recorder.current = capture;
    setHearing("");
    // What the live recognizer makes of the turn: nothing yet, a sentence
    // still going, or a finished one.
    let sentence: "none" | "open" | "over" = "none";
    const listener = new Ear((text, over) => {
      if (token !== epoch.current) return;
      sentence = over ? "over" : "open";
      setHearing(text.slice(0, 200));
    });
    ear.current = listener;
    // A word or a phrase being practised is in the language being learned;
    // anything else may be either language.
    void listener.open(
      permit.current || askPermit(),
      reference.current && !loose.current
        ? preferences.target.split("-")[0]
        : undefined,
    );
    permit.current = null;
    capture.onSamples = (samples, rate) => listener.send(samples, rate);
    const waited = granted.current;
    let heard = false,
      lastVoice = 0,
      stopping = false,
      smooth = 0,
      run = 0,
      previous = 0,
      floor = noiseFloor.current,
      lastChunk = performance.now(),
      chunks = 0,
      onset = -1;
    const asked = performance.now();
    micStat.current = "";
    manualStop.current = () => {
      if (!stopping) {
        stopping = true;
        void finish(token, heard);
      }
    };
    capture.onLost = () => manualStop.current();
    recording.current = true;
    // Every limit below is measured on incoming audio. If audio stops coming
    // (a call, Siri, the system taking the microphone), this clock ends the
    // turn instead of leaving "Te escucho" on screen forever.
    watchdog.current = setInterval(() => {
      if (token !== epoch.current || stopping) return;
      const silent = performance.now() - lastChunk;
      if (chunks ? silent > 2500 : waited && silent > 7000)
        manualStop.current();
    }, 500);
    try {
      await capture.start((rms, time) => {
        if (token !== epoch.current || stopping) return;
        lastChunk = performance.now();
        if (!chunks) micStat.current = `open=${Math.round(lastChunk - asked)}`;
        chunks++;
        if (onset < 0 && rms > Math.max(0.01, floor * 3)) {
          onset = time;
          micStat.current += `;onset=${time.toFixed(2)}`;
        }
        granted.current = true;
        // Only now is Pío really listening.
        if (live.current !== "listening") go("listening");
        showLevel(Math.min(1, rms * 12));
        // Speech is whatever rises clearly above the room's own noise, so a
        // fan or street noise cannot hold the microphone open.
        const step = time - previous;
        previous = time;
        smooth = smooth ? smooth * 0.6 + rms * 0.4 : rms;
        floor = Math.min(
          0.02,
          Math.max(0.002, Math.min(smooth, floor * 1.015)),
        );
        noiseFloor.current = floor;
        // The first instant is skipped: opening the microphone can pop.
        if (time > 0.25 && smooth > Math.max(0.01, floor * 3)) {
          run += step;
          lastVoice = time;
          // A click or a cough is not speech: it must last.
          if (run >= 0.15) heard = true;
        } else if (time - lastVoice > 0.35) run = 0;
        const quiet = time - lastVoice;
        // A learner repeating a new phrase hesitates more than someone
        // speaking their own language, so they get a longer pause.
        if (
          time >= 24.5 ||
          (!heard && time >= 8 && quiet > 0.6) ||
          // The live recognizer follows the sentence: once it takes it as
          // finished there is no need to wait out the whole pause, and while
          // it takes it as unfinished a hesitation gets more time.
          (heard &&
            quiet >
              (sentence === "over"
                ? 0.45
                : sentence === "open" && listener.alive
                  ? drill.current
                    ? 1.2
                    : 2.2
                  : // One word on its own is over quickly.
                    drill.current
                    ? 0.9
                    : reference.current
                      ? 1.4
                      : 1.1))
        )
          manualStop.current();
      });
      if (token !== epoch.current) capture.cancel();
    } catch (error) {
      recording.current = false;
      fail(error);
    }
  }
  startRef.current = (auto) => {
    void start(auto);
  };
  // "Escuchar", a marked word or the slow switch: always available, even while
  // Pío is listening, and the session carries on afterwards.
  function listen(word?: string) {
    if (!result?.text) return;
    unlockVoice();
    cancel();
    unattended.current = 0;
    void play(
      result.text,
      epoch.current,
      result.outcome !== "accepted",
      null,
      word,
    );
  }
  // Back to a phrase left pending: Pío says it and listens, as if it had
  // just been translated.
  function revisit(item: Pending) {
    if (!preferences) return;
    unlockVoice();
    reset();
    keep({
      id: crypto.randomUUID(),
      outcome: "translation",
      heard: "",
      text: item.text,
      reference: {
        id: crypto.randomUUID(),
        text: item.text,
        locale: preferences.target,
      },
      evidence: null,
      focus: [],
      voice: item.proof,
    });
    void play(item.text, epoch.current, true);
  }
  const connection = preferences
    ? connectionState(status, preferences.target, checkingStatus, statusFailed)
    : "checking";
  const ready = !!preferences && connection === "ready";
  const active = phase !== "idle";
  const today = preferences ? countMastery(entries, preferences) : 0;
  const days = preferences ? streak(entries, preferences) : 0;
  const hard = preferences ? hardToday(review, preferences) : [];
  const next = preferences
    ? pendingFor(review, preferences).find(
        (e) => e.text !== result?.reference?.text,
      )
    : undefined;
  const mood = mascotMood(phase, connection, result?.outcome, paused && !issue);
  const { title, description } =
    connection !== "ready" && !active
      ? t.connection[connection]
      : issue && !active
        ? { title: t.stumble, description: issue }
        : sessionCopy(
            {
              phase,
              outcome: result?.outcome,
              paused,
              stopped,
              missed,
              target: preferences
                ? languageIn(preferences.target, ui)
                : undefined,
              focus: result?.focus.length,
              missing: result?.evidence?.words.some(
                (w) => w.error === "Omission",
              ),
              tries,
              streak: days,
              drill: step && {
                ...step,
                means: meaningOf(
                  result?.text,
                  result ? glosses[result.text] : undefined,
                  step.word,
                ),
              },
              whole,
            },
            t,
          );
  // Short spoken updates for screen readers, only when something changed for
  // the learner. The visible instructions are not read over the microphone.
  const announce = issue
    ? issue
    : phase === "permission"
      ? t.announce.permission
      : result?.outcome === "accepted"
        ? t.announce.accepted(today)
        : result?.outcome === "practice" && phase !== "listening"
          ? `${t.announce.almost} ${result.focus.length ? t.announce.practise(result.focus.join(", ")) : ""}`
          : paused
            ? t.announce.paused
            : "";
  function retry() {
    unlockVoice();
    if (recovery === "submit" && retained.current) {
      setPaused(false);
      void submit(retained.current, epoch.current);
    } else if (recovery === "play" && lastPlayback.current)
      void play(
        lastPlayback.current.text,
        epoch.current,
        true,
        null,
        lastPlayback.current.word,
      );
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
        <p>{t.loading}</p>
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
              role="img"
              className={`chip progress ${today > 0 ? "earned" : ""}`}
              title={
                days > 1
                  ? `${t.stars.title}. ${t.stars.streak(days)}`
                  : t.stars.title
              }
              aria-label={`${today} ${t.stars.done(today)} ${t.stars.today}${days > 1 ? `, ${t.stars.days(days)}` : ""}`}
            >
              <Icon name="star" size={16} />
              {today}
            </span>
            <button
              className="language-pill"
              onClick={openSettings}
              aria-label={t.changeLanguages(
                languageName(preferences.native, ui, true),
                languageName(preferences.target, ui, true),
              )}
            >
              <span>{languageName(preferences.native, ui)}</span>
              <Icon name="arrow" size={15} />
              <strong>{languageName(preferences.target, ui)}</strong>
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
              {t.welcome.hello} <em>Pío</em>
            </h1>
            <p className="intro">{t.welcome.intro}</p>
            <ol className="steps">
              {t.welcome.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="setup-card">
              <h2>{t.welcome.choose}</h2>
              <LanguageForm
                saved={null}
                onSave={save}
                ui={ui}
                onNative={setDraft}
              />
            </div>
          </section>
        ) : (
          <section
            className={`conversation ${result?.text ? "has-phrase" : ""}`}
            aria-labelledby="session-title"
          >
            <div ref={orb} className={`pio-orb ${mood}`} aria-hidden="true">
              <span className="pio-halo" />
              <div className="pio-nest">
                <Mascot mood={mood} />
              </div>
            </div>
            <div className="session-copy">
              {/* Keyed so each new line arrives with its own soft entrance. */}
              <h1 id="session-title" key={title}>
                {title}
              </h1>
              <p key={description}>{description}</p>
              {phase === "listening" && hearing && (
                <p className="hearing" aria-hidden="true">
                  {hearing}
                </p>
              )}
            </div>
            <p className="sr-only" role="status">
              {announce}
            </p>
            {result?.outcome === "accepted" && !active && !paused && (
              <div key={result.id} className="celebrate" aria-hidden="true">
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            )}
            {ready && !active && !result && !issue && !paused && (
              <p className="example">
                {t.tryWith} <q>{t.examples[new Date().getDay()]}</q>
              </p>
            )}
            {result?.heard && (
              <div className="bubble mine">
                <span className="bubble-label">{t.youSaid}</span>
                <p
                  lang={
                    result.outcome === "translation"
                      ? preferences.native
                      : preferences.target
                  }
                >
                  {result.heard}
                </p>
              </div>
            )}
            {result?.text && (
              <PhraseCard
                result={result}
                locale={preferences.target}
                disabled={!ready || phase === "thinking"}
                slow={slow}
                onSlow={(value) => {
                  setSlow(value);
                  slowNow.current = value;
                  // Felt at once: on the voice in the air, or by saying the
                  // phrase again slowly.
                  if (audio.current)
                    audio.current.playbackRate = value ? 0.8 : 1;
                  else if (value && phase !== "thinking") listen();
                }}
                onPlay={listen}
                current={step?.word}
                playing={phase === "speaking"}
                meanings={glosses[result.text]}
                copy={t}
                language={languageIn(preferences.target, ui)}
              />
            )}
            {ready &&
              paused &&
              !active &&
              !issue &&
              (today > 0 || hard.length > 0) && (
                <div className="recap">
                  <h2>{t.recap.title}</h2>
                  {today > 0 && (
                    <p>
                      <strong>{today}</strong> {t.stars.done(today)}
                      {days > 1 && <> · {t.stars.days(days)}</>}
                    </p>
                  )}
                  {hard.length > 0 && (
                    <p lang={preferences.target}>
                      <span lang={ui}>
                        {hard.length === 1 ? t.recap.hardOne : t.recap.hardMany}
                      </span>
                      {hard.slice(0, 6).join(", ")}
                    </p>
                  )}
                </div>
              )}
            {ready && !active && !issue && next && (!result || paused) && (
              <div className="revisit">
                <p>
                  {t.pending} <q lang={preferences.target}>{next.text}</q>
                </p>
                <button className="secondary" onClick={() => revisit(next)}>
                  <Icon name="refresh" size={18} />
                  {t.review}
                </button>
              </div>
            )}
            {issue && recovery && ready && !active && (
              <div className="connection-action" role="alert">
                <button className="secondary" onClick={retry}>
                  <Icon name="refresh" size={18} />
                  {recovery === "play" ? t.listenAgain : t.retry}
                </button>
              </div>
            )}
            {connection !== "ready" &&
              (connection === "access" ? (
                <div className="connection-action">
                  <AccessForm onSuccess={refreshStatus} copy={t} />
                </div>
              ) : connection === "unconfigured" ? (
                <div className="connection-action">
                  <button className="secondary" onClick={openSettings}>
                    {t.changeLanguage}
                  </button>
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
                    {checkingStatus ? t.checking : t.retry}
                  </button>
                </div>
              ))}
            {(ready || active) && (
              <div className="dock">
                <button
                  ref={mic}
                  className={`mic-button ${phase}`}
                  aria-label={microphoneLabel(phase, t)}
                  onClick={() => {
                    buzz(10);
                    unlockVoice();
                    if (phase === "listening") manualStop.current();
                    else if (phase === "permission") return;
                    else if (phase === "thinking" || phase === "waking")
                      pause(true);
                    // Idle starts a session; while Pío talks, one tap
                    // interrupts and listens straight away.
                    else void start();
                  }}
                >
                  <span className="mic-ring" />
                  <Icon
                    name={phase === "thinking" ? "close" : "mic"}
                    size={34}
                  />
                </button>
                <p className="dock-label" aria-hidden="true">
                  {microphoneLabel(phase, t)}
                </p>
                {!result && !active && !paused && (
                  <p className="dock-hint">{t.hint}</p>
                )}
                <div className="dock-actions">
                  {active && phase !== "permission" && (
                    <button className="text-button" onClick={() => pause(true)}>
                      <Icon name="pause" size={18} />
                      {t.pause}
                    </button>
                  )}
                  {result && phase !== "thinking" && (
                    <button
                      className="text-button"
                      onClick={() => {
                        unlockVoice();
                        reset();
                        void start();
                      }}
                    >
                      <Icon name="refresh" size={18} />
                      {result.outcome === "conversation"
                        ? t.restart
                        : t.another}
                    </button>
                  )}
                </div>
              </div>
            )}
            <details className="help-details">
              <summary>{t.help.summary}</summary>
              <ol>
                {t.help.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>{t.help.microphone}</p>
              <p>{t.help.privacy}</p>
            </details>
          </section>
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
        onClose={() => setDraft("")}
      >
        <div className="dialog-heading">
          <h2 id="settings-title">{t.settings.title}</h2>
          <button
            aria-label={t.settings.close}
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
            ui={ui}
            onNative={setDraft}
          />
        )}
      </dialog>
    </div>
  );
}
function AccessForm({
  onSuccess,
  copy,
}: {
  onSuccess: () => Promise<void>;
  copy: Copy;
}) {
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
            signal: anySignal(10000),
          });
          if (!response.ok) throw new Error();
          form.reset();
          setIssue("");
          await onSuccess();
        } catch {
          setIssue(copy.access.failed);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        {copy.access.label}
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
        {busy ? copy.access.entering : copy.access.enter}
      </button>
      {issue && (
        <p id={errorId} role="alert">
          {issue}
        </p>
      )}
    </form>
  );
}
