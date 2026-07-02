'use client';

import { useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  language: string;
  /** Fallback Web Speech API (solo si no hay micrófono vía MediaRecorder) */
  onTextRecognized?: (text: string) => void;
}

/**
 * Graba audio con MediaRecorder y lo entrega como Blob para procesarlo
 * con Whisper en el servidor (STT + detección de idioma + evaluación).
 * Web Speech API queda como fallback si getUserMedia falla.
 */
export function VoiceRecorder({
  onRecordingComplete,
  isRecording,
  onStartRecording,
  onStopRecording,
  language,
  onTextRecognized,
}: VoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (audioBlob.size > 0) onRecordingComplete(audioBlob);
      };

      mediaRecorder.start();
      onStartRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      startWebSpeechFallback();
    }
  };

  const startWebSpeechFallback = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert('No se pudo acceder al micrófono. Por favor, permite el acceso.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTextRecognized?.(transcript);
      onStopRecording();
    };
    recognition.onerror = () => onStopRecording();
    recognition.onend = () => onStopRecording();
    recognition.start();
    recognitionRef.current = recognition;
    onStartRecording();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    onStopRecording();
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      aria-label={isRecording ? 'Detener grabación' : 'Grabar'}
      className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all text-white active:scale-95"
      style={{
        background: isRecording
          ? 'rgba(248,113,113,0.15)'
          : 'rgba(255,255,255,0.06)',
        border: isRecording
          ? '1.5px solid rgba(248,113,113,0.6)'
          : '1.5px solid rgba(139,156,249,0.45)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: isRecording
          ? '0 0 44px 8px rgba(248,113,113,0.3)'
          : '0 0 34px 6px rgba(139,156,249,0.22)',
      }}
    >
      {!isRecording && (
        <span
          className="orb-spin-layer absolute -inset-1 rounded-full pointer-events-none"
          aria-hidden
          style={{
            background:
              'conic-gradient(from 0deg, rgba(139,156,249,0.5), rgba(108,212,255,0.5), rgba(246,178,107,0.4), rgba(242,140,192,0.5), rgba(139,156,249,0.5))',
            WebkitMask: 'radial-gradient(circle, transparent 68%, black 70%)',
            mask: 'radial-gradient(circle, transparent 68%, black 70%)',
            animation: 'orb-spin 8s linear infinite',
          }}
        />
      )}
      {isRecording ? (
        <span className="flex items-end gap-1 h-7" aria-hidden>
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className="wave-bar w-1.5 rounded-full bg-white"
              style={{ height: '100%', animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </span>
      ) : (
        <Mic className="w-8 h-8" />
      )}
    </button>
  );
}
