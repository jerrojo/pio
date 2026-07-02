'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageCode, ConversationMode, PronunciationScore } from '@/types';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { MainCircle } from '@/components/MainCircle';
import { getLanguage } from '@/lib/languages';
import { NATIVE_SAMPLES, TARGET_SAMPLES } from '@/lib/phrases';
import { evaluatePronunciation, shouldRepeat, hasMastered, canChallenge } from '@/lib/pronunciation';
import { translateText } from '@/lib/agent';
import { SkipForward, Trophy, Volume2, Languages, RotateCcw, Sparkles } from 'lucide-react';

interface IntelligentConversationProps {
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onChangeLanguages?: () => void;
}

/** Fases del pipeline visibles al usuario (show the work, LukeW) */
type Phase = 'idle' | 'listening' | 'transcribing' | 'translating' | 'evaluating' | 'done';

const PHASE_LABELS: Record<Exclude<Phase, 'idle' | 'done'>, string> = {
  listening: 'Escuchando',
  transcribing: 'Transcribiendo tu voz',
  translating: 'Traduciendo',
  evaluating: 'Evaluando pronunciación',
};

export function IntelligentConversation({
  userLanguage,
  targetLanguage,
  onChangeLanguages,
}: IntelligentConversationProps) {
  const [mode, setMode] = useState<ConversationMode>('detection');
  const [phase, setPhase] = useState<Phase>('idle');
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState<PronunciationScore | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const detectLanguage = async (text: string): Promise<LanguageCode> => {
    const response = await fetch('/api/detect-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.language || userLanguage;
  };

  const routeByLanguage = async (text: string, detected: LanguageCode, audioBlob?: Blob) => {
    setCurrentText(text);
    setDetectedLanguage(detected);

    if (detected === targetLanguage) {
      setMode('evaluation');
      setPhase('evaluating');
      await evaluateUserPronunciation(text, audioBlob);
    } else {
      setMode('translation');
      setPhase('translating');
      await translateAndSpeak(text);
    }
    setPhase('done');
  };

  const handleTextRecognized = async (text: string, audioBlob?: Blob) => {
    setMode('detection');
    setPhase('transcribing');
    const detected = await detectLanguage(text);
    await routeByLanguage(text, detected, audioBlob);
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setMode('detection');
    setPhase('transcribing');
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.text) {
        await routeByLanguage(data.text, data.language || userLanguage, audioBlob);
      } else {
        setPhase('idle');
        setErrorMsg('No escuché nada. Intenta de nuevo más cerca del micrófono.');
      }
    } catch (error: any) {
      console.error('Error processing audio:', error);
      setPhase('idle');
      setErrorMsg('Hubo un problema procesando tu voz. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const translateAndSpeak = async (text: string) => {
    const translated = await translateText(text, targetLanguage, userLanguage);
    setTranslatedText(translated);
    await playElevenLabsAudio(translated);
  };

  const evaluateUserPronunciation = async (userText: string, audioBlob?: Blob) => {
    const targetText = translatedText || userText;
    const score = await evaluatePronunciation(audioBlob ?? null, targetText, targetLanguage, userText);

    setPronunciationScore(score);
    setInteractionCount(prev => prev + 1);

    if (hasMastered(score.score)) {
      playCelebrationSound();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2200);

      setTimeout(() => {
        setMode('detection');
        setPhase('idle');
        setPronunciationScore(null);
        setCurrentText('');
        setTranslatedText('');
      }, 3000);
    }
  };

  const playElevenLabsAudio = async (text: string) => {
    try {
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: getLanguage(targetLanguage).elevenLabsVoiceId,
          model: 'eleven_multilingual_v2',
        }),
      });
      if (!response.ok) return;

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const playCelebrationSound = () => {
    const audio = new Audio('/sounds/celebration.mp3');
    audio.play().catch(() => {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.frequency.value = 523.25;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    });
  };

  const handleSkip = () => {
    setMode('detection');
    setPhase('idle');
    setPronunciationScore(null);
    setCurrentText('');
    setTranslatedText('');
  };

  const handleRepeat = () => {
    if (mode === 'translation') {
      playElevenLabsAudio(translatedText);
    } else if (mode === 'evaluation') {
      setIsRecording(true);
    }
  };

  const idle = mode === 'detection' && !currentText && !isRecording && !isProcessing;
  const aiActive = isRecording || isProcessing || phase === 'translating' || phase === 'evaluating';
  const statusLabel = isRecording
    ? PHASE_LABELS.listening
    : phase !== 'idle' && phase !== 'done'
    ? PHASE_LABELS[phase]
    : null;

  const nativeSamples = NATIVE_SAMPLES[userLanguage] ?? [];
  const targetSample = TARGET_SAMPLES[targetLanguage];

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Edge glow: la pantalla entera se enciende cuando la IA trabaja */}
      <AnimatePresence>
        {(aiActive || showCelebration) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`edge-glow ${showCelebration ? 'edge-glow-gold' : ''}`}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full orb-gradient" aria-hidden />
          <span className="font-medium tracking-tight text-white text-lg">pío</span>
        </div>

        <button
          onClick={onChangeLanguages}
          className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors"
          aria-label="Cambiar idiomas"
        >
          <Languages className="w-4 h-4 text-slate-400" />
          {getLanguage(userLanguage).name} → {getLanguage(targetLanguage).name}
        </button>

        <div
          className="glass rounded-full px-3.5 py-2 text-xs font-medium text-slate-300 tabular-nums flex items-center gap-1.5"
          title="Frases practicadas"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          {interactionCount}
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 max-w-2xl w-full mx-auto">
        <MainCircle
          mode={mode}
          score={pronunciationScore?.score}
          isListening={isRecording || isProcessing}
        />

        {/* Estado del pipeline (show the work) */}
        <div className="h-6 mt-3">
          <AnimatePresence mode="wait">
            {statusLabel && (
              <motion.p
                key={statusLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm font-medium text-spectrum"
              >
                {statusLabel}…
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Estado en reposo: frases sugeridas accionables, no instrucciones */}
        <AnimatePresence>
          {idle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 w-full max-w-md"
            >
              <p className="text-slate-500 text-center text-sm mb-4">
                Habla o toca una frase para empezar
              </p>
              <div className="flex flex-col items-stretch gap-2">
                {nativeSamples.map(phrase => (
                  <button
                    key={phrase}
                    onClick={() => handleTextRecognized(phrase)}
                    className="glass rounded-2xl px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-between gap-3"
                  >
                    <span>«{phrase}»</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 shrink-0">
                      Traducir
                    </span>
                  </button>
                ))}
                {targetSample && (
                  <button
                    onClick={() => handleTextRecognized(targetSample)}
                    className="glass rounded-2xl px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors flex items-center justify-between gap-3"
                    style={{ borderColor: 'rgba(139,156,249,0.3)' }}
                  >
                    <span className="text-spectrum font-medium">«{targetSample}»</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 shrink-0">
                      Practicar
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcripción y traducción */}
        <div className="w-full max-w-md mt-8 space-y-3">
          <AnimatePresence>
            {currentText && (
              <motion.div
                key="user-text"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="glass rounded-2xl p-4"
              >
                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                  Escuché{detectedLanguage ? ` · ${getLanguage(detectedLanguage).name}` : ''}
                </p>
                <p className="text-slate-100">{currentText}</p>
              </motion.div>
            )}

            {translatedText && mode === 'translation' && (
              <motion.div
                key="translation"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="glass rounded-2xl p-4"
                style={{ borderColor: 'rgba(139,156,249,0.35)', boxShadow: '0 0 30px rgba(139,156,249,0.1)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {getLanguage(targetLanguage).name} — repítelo en voz alta
                  </p>
                  <button
                    onClick={() => playElevenLabsAudio(translatedText)}
                    className="text-slate-300 hover:text-white transition-colors"
                    aria-label="Escuchar de nuevo"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-white font-medium text-lg tracking-tight">{translatedText}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback de pronunciación */}
          <AnimatePresence>
            {pronunciationScore && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass rounded-2xl p-4"
                style={{
                  borderColor:
                    pronunciationScore.score < 7
                      ? 'rgba(248,113,113,0.35)'
                      : pronunciationScore.score < 9
                      ? 'rgba(246,178,107,0.35)'
                      : 'rgba(74,222,128,0.35)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">
                    {pronunciationScore.score < 7
                      ? 'Vamos de nuevo'
                      : pronunciationScore.score < 9
                      ? 'Bien'
                      : 'Excelente'}
                  </span>
                  <span
                    className={`text-xl font-semibold tabular-nums ${
                      pronunciationScore.score < 7
                        ? 'text-red-300'
                        : pronunciationScore.score < 9
                        ? 'text-amber-300'
                        : 'text-green-300'
                    }`}
                  >
                    {pronunciationScore.score}/10
                  </span>
                </div>
                <p className="text-sm text-slate-300">{pronunciationScore.feedback}</p>

                {pronunciationScore.weakPhonemes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
                      Palabras a pulir
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pronunciationScore.weakPhonemes.slice(0, 4).map(w => (
                        <span
                          key={w}
                          className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {shouldRepeat(pronunciationScore.score) && (
                  <button
                    onClick={handleRepeat}
                    className="btn-primary mt-4 w-full px-4 py-2.5 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repetir
                  </button>
                )}

                {canChallenge(pronunciationScore.score) && (
                  <button
                    onClick={handleRepeat}
                    className="btn-ghost mt-4 w-full px-4 py-2.5 flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-300" />
                    Ir por 9/10
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error toast */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 glass-deep rounded-2xl px-4 py-3 text-sm text-red-200 z-50 w-[calc(100%-3rem)] max-w-sm text-center"
              style={{ borderColor: 'rgba(248,113,113,0.35)' }}
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Controles */}
      <footer className="sticky bottom-0 pb-6 pt-3 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            isRecording={isRecording}
            onStartRecording={() => setIsRecording(true)}
            onStopRecording={() => setIsRecording(false)}
            language={getLanguage(mode === 'evaluation' ? targetLanguage : userLanguage).locale}
            onTextRecognized={text => handleTextRecognized(text)}
          />

          {!idle && (
            <button
              onClick={handleSkip}
              className="btn-ghost px-5 py-3.5 flex items-center gap-2 text-sm"
            >
              <SkipForward className="w-4 h-4" />
              Nueva frase
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
