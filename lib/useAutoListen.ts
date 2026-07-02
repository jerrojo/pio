'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type MicPermission = 'pending' | 'granted' | 'denied';

interface Options {
  /** Cuando es false, el micrófono sigue abierto pero no captura (ej. mientras Pío habla) */
  enabled: boolean;
  onSpeechEnd: (blob: Blob) => void;
}

const SPEECH_THRESHOLD = 0.018; // RMS mínimo para considerar voz
const SILENCE_MS = 1300;        // silencio que cierra el turno
const MIN_SPEECH_MS = 450;      // descartar blips de ruido
const MAX_SPEECH_MS = 20000;    // failsafe

/**
 * Escucha continua manos libres con dos defensas específicas para iOS Safari:
 *
 * 1. AudioContext nace suspendido sin gesto del usuario → exponemos
 *    `needsTouch` + `unlock()` para reanudarlo con un solo toque (una vez
 *    por sesión). En Android/desktop arranca solo.
 * 2. iOS mutea o mata el track del micrófono al reproducir audio (cambio
 *    de sesión de audio) → vigilamos mute/ended y re-adquirimos el stream
 *    automáticamente, reconectando el análisis sin intervención.
 */
export function useAutoListen({ enabled, onSpeechEnd }: Options) {
  const [permission, setPermission] = useState<MicPermission>('pending');
  const [isCapturing, setIsCapturing] = useState(false);
  const [needsTouch, setNeedsTouch] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const discardRef = useRef(false);
  const capturingRef = useRef(false);
  const reacquiringRef = useRef(false);
  const lastResumeTryRef = useRef(0);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;

  const attachStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    const ctx = ctxRef.current;
    if (ctx) {
      sourceRef.current?.disconnect();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = analyserRef.current ?? ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      sourceRef.current = source;
      analyserRef.current = analyser;
    }

    // iOS mutea/mata el track al reproducir TTS → re-adquirir solo
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.onended = () => reacquire();
      track.onmute = () => {
        // Dale 1.5s por si se des-mutea solo al terminar el audio
        setTimeout(() => {
          const t = streamRef.current?.getAudioTracks()[0];
          if (t && (t.muted || t.readyState === 'ended')) reacquire();
        }, 1500);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reacquire = useCallback(async () => {
    if (reacquiringRef.current) return;
    reacquiringRef.current = true;
    try {
      streamRef.current?.getTracks().forEach(t => {
        t.onended = null;
        t.onmute = null;
        t.stop();
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      attachStream(stream);
    } catch {
      /* si falla, el siguiente tick lo reintentará vía track ended */
    } finally {
      reacquiringRef.current = false;
    }
  }, [attachStream]);

  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || capturingRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;
    chunksRef.current = [];
    discardRef.current = false;

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
      capturingRef.current = false;
      setIsCapturing(false);
      if (!discardRef.current && blob.size > 0) {
        onSpeechEndRef.current(blob);
      }
    };

    recorder.start();
    capturingRef.current = true;
    setIsCapturing(true);
    speechStartRef.current = Date.now();
    silenceStartRef.current = null;
  }, []);

  const stopRecorder = useCallback((discard: boolean) => {
    discardRef.current = discard;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      capturingRef.current = false;
      setIsCapturing(false);
    }
    silenceStartRef.current = null;
    speechStartRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    // iOS: el contexto puede estar suspendido hasta un gesto del usuario
    if (ctx.state !== 'running') {
      setNeedsTouch(true);
      const now = Date.now();
      if (now - lastResumeTryRef.current > 2000) {
        lastResumeTryRef.current = now;
        ctx.resume().catch(() => {});
      }
      return;
    }
    setNeedsTouch(false);

    if (!enabledRef.current) {
      if (capturingRef.current) stopRecorder(true);
      return;
    }

    // Si iOS dejó el track muerto y no saltó el evento, re-adquirir
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track || track.readyState === 'ended') {
      reacquire();
      return;
    }

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const now = Date.now();

    if (rms > SPEECH_THRESHOLD) {
      silenceStartRef.current = null;
      if (!capturingRef.current) startRecorder();
      else if (speechStartRef.current && now - speechStartRef.current > MAX_SPEECH_MS) {
        stopRecorder(false);
      }
    } else if (capturingRef.current) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = now;
      } else if (now - silenceStartRef.current > SILENCE_MS) {
        const spoke =
          speechStartRef.current !== null &&
          now - speechStartRef.current - SILENCE_MS > MIN_SPEECH_MS;
        stopRecorder(!spoke);
      }
    }
  }, [startRecorder, stopRecorder, reacquire]);

  /** Llamar desde cualquier toque del usuario: reanuda el AudioContext (iOS) */
  const unlock = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const Ctx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        attachStream(stream);

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
          setNeedsTouch(true);
        }

        // Cualquier primer toque en la página desbloquea
        const onPointer = () => {
          ctx.resume().catch(() => {});
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            ctx.resume().catch(() => {});
            const t = streamRef.current?.getAudioTracks()[0];
            if (!t || t.readyState === 'ended' || t.muted) reacquire();
          }
        });

        setPermission('granted');
        intervalRef.current = setInterval(tick, 90);
      } catch {
        if (!cancelled) setPermission('denied');
      }
    };

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        discardRef.current = true;
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryPermission = useCallback(() => {
    window.location.reload();
  }, []);

  return { permission, isCapturing, needsTouch, unlock, retryPermission };
}
