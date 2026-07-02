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
      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
        isRecording
          ? 'bg-red-500 hover:bg-red-400 text-white'
          : 'bg-amber-400 hover:bg-amber-300 text-slate-900'
      }`}
      style={{
        boxShadow: isRecording
          ? '0 0 40px 6px rgba(239,68,68,0.45)'
          : '0 0 34px 4px rgba(251,191,36,0.35)',
      }}
    >
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
