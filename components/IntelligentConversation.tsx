'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageCode, ConversationMode, PronunciationScore } from '@/types';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { MainCircle } from '@/components/MainCircle';
import { getLanguage } from '@/lib/languages';
import { evaluatePronunciation, shouldRepeat, hasMastered, canChallenge } from '@/lib/pronunciation';
import { translateText } from '@/lib/agent';
import { SkipForward, Trophy, Volume2, Languages, RotateCcw } from 'lucide-react';

interface IntelligentConversationProps {
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onChangeLanguages?: () => void;
}

export function IntelligentConversation({
  userLanguage,
  targetLanguage,
  onChangeLanguages,
}: IntelligentConversationProps) {
  const [mode, setMode] = useState<ConversationMode>('detection');
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
      await evaluateUserPronunciation(text, audioBlob);
    } else {
      setMode('translation');
      await translateAndSpeak(text);
    }
  };

  const handleTextRecognized = async (text: string, audioBlob?: Blob) => {
    setMode('detection');
    const detected = await detectLanguage(text);
    await routeByLanguage(text, detected, audioBlob);
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Whisper: transcripción + detección de idioma en una llamada
    setMode('detection');
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
        setErrorMsg('No escuché nada. Intenta de nuevo más cerca del micrófono.');
      }
    } catch (error: any) {
      console.error('Error processing audio:', error);
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
      setTimeout(() => setShowCelebration(false), 2000);

      setTimeout(() => {
        setMode('detection');
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

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐣</span>
          <span className="font-extrabold tracking-wide text-white">
            P<span className="text-amber-400">Í</span>O
          </span>
        </div>

        <button
          onClick={onChangeLanguages}
          className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors"
          aria-label="Cambiar idiomas"
        >
          <Languages className="w-4 h-4 text-amber-300" />
          {getLanguage(userLanguage).flag} → {getLanguage(targetLanguage).flag}{' '}
          {getLanguage(targetLanguage).name}
        </button>

        <div className="glass rounded-full px-3 py-2 text-xs font-semibold text-slate-300" title="Interacciones">
          ⚡ {interactionCount}
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 max-w-2xl w-full mx-auto">
        <MainCircle
          mode={mode}
          score={pronunciationScore?.score}
          isListening={isRecording || isProcessing}
        />

        {/* Hint inicial */}
        <AnimatePresence>
          {idle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-slate-400 text-center mt-6 max-w-xs text-sm leading-relaxed"
            >
              Toca el micrófono y habla en{' '}
              <span className="text-slate-200 font-medium">{getLanguage(userLanguage).name}</span> para
              traducir, o en{' '}
              <span className="text-amber-300 font-medium">{getLanguage(targetLanguage).name}</span> para
              practicar tu pronunciación
            </motion.p>
          )}
        </AnimatePresence>

        {/* Estado procesando */}
        <AnimatePresence>
          {isProcessing && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-cyan-300/80 text-sm mt-6 animate-pulse"
            >
              Pío te está escuchando…
            </motion.p>
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
                  Tú {detectedLanguage ? getLanguage(detectedLanguage).flag : ''}
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
                className="rounded-2xl p-4 border border-lime-400/25 bg-lime-400/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-lime-300/80">
                    {getLanguage(targetLanguage).flag} {getLanguage(targetLanguage).name} — repítelo
                  </p>
                  <button
                    onClick={() => playElevenLabsAudio(translatedText)}
                    className="text-lime-300 hover:text-lime-200 transition-colors"
                    aria-label="Escuchar de nuevo"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-lime-100 font-medium text-lg">{translatedText}</p>
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
                className={`rounded-2xl p-4 border ${
                  pronunciationScore.score < 7
                    ? 'border-red-400/30 bg-red-400/10'
                    : pronunciationScore.score < 9
                    ? 'border-yellow-400/30 bg-yellow-400/10'
                    : 'border-green-400/30 bg-green-400/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white">
                    {pronunciationScore.score < 7
                      ? 'Vamos de nuevo'
                      : pronunciationScore.score < 9
                      ? '¡Bien!'
                      : '¡Excelente!'}
                  </span>
                  <span
                    className={`text-2xl font-bold ${
                      pronunciationScore.score < 7
                        ? 'text-red-300'
                        : pronunciationScore.score < 9
                        ? 'text-yellow-300'
                        : 'text-green-300'
                    }`}
                  >
                    {pronunciationScore.score}/10
                  </span>
                </div>
                <p className="text-sm text-slate-300">{pronunciationScore.feedback}</p>

                {pronunciationScore.weakPhonemes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {pronunciationScore.weakPhonemes.slice(0, 4).map(w => (
                      <span
                        key={w}
                        className="text-xs px-2 py-1 rounded-full bg-white/10 text-slate-200 border border-white/10"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                )}

                {shouldRepeat(pronunciationScore.score) && (
                  <button
                    onClick={handleRepeat}
                    className="mt-4 w-full px-4 py-2.5 bg-red-400/90 hover:bg-red-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Repetir
                  </button>
                )}

                {canChallenge(pronunciationScore.score) && (
                  <button
                    onClick={handleRepeat}
                    className="mt-4 w-full px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trophy className="w-4 h-4" />
                    ¿Ir por 9/10?
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
              className="fixed bottom-28 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-3 text-sm text-red-200 border-red-400/30 z-50"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebración */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-amber-400/10 z-40 pointer-events-none"
            >
              <motion.div
                animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
                transition={{ duration: 0.8 }}
                className="text-8xl"
              >
                🎉
              </motion.div>
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

          <button
            onClick={handleSkip}
            className="btn-ghost px-5 py-3.5 flex items-center gap-2 text-sm"
          >
            <SkipForward className="w-4 h-4" />
            Skip Class
          </button>
        </div>
      </footer>
    </div>
  );
}
