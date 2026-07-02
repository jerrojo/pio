'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type MicPermission = 'pending' | 'granted' | 'denied';

interface Options {
  /** Cuando es false, el micrófono sigue abierto pero no captura (ej. mientras Pío habla) */
  enabled: boolean;
  onSpeechEnd: (blob: Blob) => void;
}

const SPEECH_THRESHOLD = 0.022; // RMS mínimo para considerar voz
const SILENCE_MS = 1300;        // silencio que cierra el turno
const MIN_SPEECH_MS = 450;      // descartar blips de ruido
const MAX_SPEECH_MS = 20000;    // failsafe

/**
 * Escucha continua manos libres: pide permiso de micrófono al montar,
 * detecta actividad de voz con Web Audio (RMS) y entrega un Blob de audio
 * cuando detecta que terminaste de hablar. Como una conversación real.
 */
export function useAutoListen({ enabled, onSpeechEnd }: Options) {
  const [permission, setPermission] = useState<MicPermission>('pending');
  const [isCapturing, setIsCapturing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const discardRef = useRef(false);
  const capturingRef = useRef(false);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;

  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || capturingRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    discardRef.current = false;

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
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
    const analyser = analyserRef.current;
    if (!analyser) return;

    // Si el sistema está ocupado (procesando / hablando), no capturamos
    if (!enabledRef.current) {
      if (capturingRef.current) stopRecorder(true);
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
  }, [startRecorder, stopRecorder]);

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
        streamRef.current = stream;

        const Ctx: typeof AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyserRef.current = analyser;

        // iOS puede arrancar el AudioContext suspendido: intentamos reanudar
        // y dejamos un desbloqueo por primer toque como respaldo.
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
          const unlock = () => {
            ctx.resume().catch(() => {});
            document.removeEventListener('pointerdown', unlock);
          };
          document.addEventListener('pointerdown', unlock);
        }

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

  return { permission, isCapturing, retryPermission };
}
