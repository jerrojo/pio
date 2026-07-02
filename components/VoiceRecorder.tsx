'use client';

import { useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

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
      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 animate-pulse'
          : 'bg-primary-500 hover:bg-primary-600'
      } text-white`}
    >
      {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
    </button>
  );
}
