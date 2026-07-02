'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageCode, ConversationMode, PronunciationScore } from '@/types';
import { MainCircle } from '@/components/MainCircle';
import { getLanguage } from '@/lib/languages';
import { useAutoListen } from '@/lib/useAutoListen';
import { evaluatePronunciation, shouldRepeat, hasMastered } from '@/lib/pronunciation';
import { translateText } from '@/lib/agent';
import { Languages, MicOff, Volume2 } from 'lucide-react';

interface IntelligentConversationProps {
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onChangeLanguages?: () => void;
}

type Phase = 'idle' | 'listening' | 'transcribing' | 'translating' | 'evaluating' | 'done';

const PHASE_LABELS: Record<Exclude<Phase, 'idle' | 'done'>, string> = {
  listening: 'Te escucho',
  transcribing: 'Un momento',
  translating: 'Traduciendo',
  evaluating: 'Evaluando tu pronunciación',
};

/**
 * Conversación manos libres: sin botones. El micrófono se activa solo,
 * la detección de voz decide cuándo empezaste y terminaste de hablar,
 * y el loop traducción ↔ evaluación fluye como una conversación real.
 * Tocar el orbe reinicia el turno (o desbloquea el audio en iOS).
 */
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const pendingAudioRef = useRef<HTMLAudioElement | null>(null);
  const translatedRef = useRef('');
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const busy = isProcessing || isSpeaking || showCelebration;

  const { permission, isCapturing, needsTouch, unlock, playAudioData, retryPermission } = useAutoListen({
    enabled: !busy,
    onSpeechEnd: blob => handleSpeech(blob),
  });

  /** Un toque desbloquea a la vez el análisis de voz (AudioContext) y el
   *  autoplay de audio en iOS, reproduciendo un WAV silencioso. */
  const unlockAll = () => {
    unlock();
    if (!audioUnlockedRef.current) {
      const silent = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      );
      silent.play().then(() => { audioUnlockedRef.current = true; }).catch(() => {});
    }
  };

  const handleSpeech = async (audioBlob: Blob) => {
    // Routing por contexto: si Pío acaba de darte una frase para repetir,
    // tu siguiente intervención ES el intento en el idioma objetivo.
    // Forzamos la transcripción en ese idioma (con la frase esperada como
    // sesgo) y evaluamos — sin adivinar. Adivinar el idioma de una frase
    // corta con acento es justo donde Whisper falla.
    const expecting = translatedRef.current;

    setMode('detection');
    setPhase('transcribing');
    setIsProcessing(true);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', audioBlob, `speech.${ext}`);
      if (expecting) {
        formData.append('language', targetLanguage);
        formData.append('prompt', expecting);
      }

      const response = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (!data.text) {
        setPhase('idle');
        return;
      }

      if (expecting) {
        setCurrentText(data.text);
        setDetectedLanguage(targetLanguage);
        setMode('evaluation');
        setPhase('evaluating');
        await evaluateUserPronunciation(data.text, audioBlob);
        setPhase('done');
      } else {
        await routeByLanguage(data.text, data.language || userLanguage, audioBlob);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setPhase('idle');
      setErrorMsg('Hubo un problema procesando tu voz. Sigue hablando, te escucho.');
    } finally {
      setIsProcessing(false);
    }
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
      const translated = await translateText(text, targetLanguage, userLanguage);
      setTranslatedText(translated);
      translatedRef.current = translated;
      await speak(translated);
    }
    setPhase('done');
  };

  const evaluateUserPronunciation = async (userText: string, audioBlob?: Blob) => {
    const targetText = translatedRef.current || userText;
    const score = await evaluatePronunciation(audioBlob ?? null, targetText, targetLanguage, userText);
    setPronunciationScore(score);

    if (hasMastered(score.score)) {
      playCelebrationSound();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2200);
      await speak(
        score.score >= 9 ? '¡Excelente! Lo dominaste.' : '¡Muy bien! Lo lograste.',
        userLanguage
      );
      setTimeout(() => resetTurn(), 800);
    } else {
      // Feedback hablado en tu idioma + Pío re-modela la frase en el idioma objetivo
      await speak(score.feedback || 'Casi. Inténtalo otra vez.', userLanguage);
      if (translatedRef.current) {
        await speak(translatedRef.current, targetLanguage);
      }
    }
  };

  /** Reproduce TTS y espera a que TERMINE antes de volver a escuchar */
  const speak = async (text: string, lang: LanguageCode = targetLanguage) => {
    try {
      setIsSpeaking(true);
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: getLanguage(lang).elevenLabsVoiceId,
          model: 'eleven_multilingual_v2',
        }),
      });
      if (!response.ok) return;

      const data = await response.arrayBuffer();

      // Vía principal: Web Audio por el AudioContext ya desbloqueado
      // (inmune al bloqueo de autoplay de iOS). Espera a que TERMINE.
      const played = await playAudioData(data);
      if (played) {
        setNeedsAudioUnlock(false);
        return;
      }

      // Fallback: HTMLAudio (puede requerir un toque en iOS)
      const audioUrl = URL.createObjectURL(new Blob([data], { type: 'audio/mpeg' }));
      const audio = new Audio(audioUrl);
      await new Promise<void>(resolve => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => resolve();
        audio
          .play()
          .then(() => setNeedsAudioUnlock(false))
          .catch(() => {
            pendingAudioRef.current = audio;
            setNeedsAudioUnlock(true);
            resolve();
          });
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      // Pequeño colchón para que el mic no capture la cola del altavoz
      setTimeout(() => setIsSpeaking(false), 350);
    }
  };

  const playCelebrationSound = () => {
    const audio = new Audio('/sounds/celebration.mp3');
    audio.play().catch(() => {});
  };

  const resetTurn = () => {
    setMode('detection');
    setPhase('idle');
    setPronunciationScore(null);
    setCurrentText('');
    setTranslatedText('');
    translatedRef.current = '';
  };

  const handleOrbTap = () => {
    unlockAll();
    if (needsAudioUnlock && pendingAudioRef.current) {
      const audio = pendingAudioRef.current;
      pendingAudioRef.current = null;
      setNeedsAudioUnlock(false);
      setIsSpeaking(true);
      audio.onended = () => setTimeout(() => setIsSpeaking(false), 350);
      audio.play().catch(() => setIsSpeaking(false));
      return;
    }
    resetTurn();
  };

  const statusLabel = isCapturing
    ? PHASE_LABELS.listening
    : phase !== 'idle' && phase !== 'done'
    ? PHASE_LABELS[phase]
    : isSpeaking
    ? 'Repite después de mí'
    : null;

  const aiActive = isCapturing || isProcessing || isSpeaking;

  // ── Permiso de micrófono ──
  if (permission === 'denied') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="glass rounded-3xl p-8 text-center max-w-sm">
          <MicOff className="w-10 h-10 mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-medium tracking-tight text-white mb-2">
            Pío necesita escucharte
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Permite el acceso al micrófono en tu navegador para conversar. Todo funciona con tu
            voz: no hay nada que escribir.
          </p>
          <button onClick={retryPermission} className="btn-primary w-full px-6 py-3">
            Permitir micrófono
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Edge glow cuando la IA está activa */}
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

      {/* Header mínimo */}
      <header className="flex items-center justify-between px-5 py-4 max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full orb-gradient" aria-hidden />
          <span className="font-medium tracking-tight text-white text-lg">pío</span>
        </div>

        <button
          onClick={onChangeLanguages}
          className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
          aria-label="Cambiar idiomas"
        >
          <Languages className="w-4 h-4 text-slate-400" />
          {getLanguage(targetLanguage).name}
        </button>
      </header>

      {/* Centro: solo el orbe */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10 max-w-2xl w-full mx-auto">
        <button
          onClick={handleOrbTap}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b9cf9]/60"
          aria-label={needsAudioUnlock ? 'Tocar para activar el audio' : 'Tocar para nueva frase'}
        >
          <MainCircle
            mode={mode}
            score={pronunciationScore?.score}
            isListening={isCapturing || isProcessing}
          />
        </button>

        {/* Estado */}
        <div className="h-6 mt-3">
          <AnimatePresence mode="wait">
            {needsTouch ? (
              <motion.button
                key="touch"
                onClick={unlockAll}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-spectrum"
              >
                Toca el orbe una vez para comenzar
              </motion.button>
            ) : permission === 'pending' ? (
              <motion.p
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-slate-500"
              >
                Activando micrófono…
              </motion.p>
            ) : needsAudioUnlock ? (
              <motion.p
                key="unlock"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-spectrum"
              >
                Toca el orbe para escuchar la respuesta
              </motion.p>
            ) : statusLabel ? (
              <motion.p
                key={statusLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm font-medium text-spectrum"
              >
                {statusLabel}…
              </motion.p>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-slate-500"
              >
                Habla cuando quieras — en {getLanguage(userLanguage).name.toLowerCase()} traduzco,
                en {getLanguage(targetLanguage).name.toLowerCase()} te evalúo
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Conversación */}
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
                style={{
                  borderColor: 'rgba(139,156,249,0.35)',
                  boxShadow: '0 0 30px rgba(139,156,249,0.1)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {getLanguage(targetLanguage).name} — repítelo en voz alta
                  </p>
                  <button
                    onClick={() => speak(translatedText)}
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
                      ? 'Casi — inténtalo otra vez'
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
                  <p className="mt-3 text-xs text-slate-400">
                    Solo dilo de nuevo — te sigo escuchando.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error toast */}
        <AnimatePresence>
          {errorMsg && (
            <div className="fixed bottom-10 inset-x-0 z-50 flex justify-center px-6 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-deep rounded-2xl px-4 py-3 text-sm text-red-200 w-full max-w-sm text-center"
                style={{ borderColor: 'rgba(248,113,113,0.35)' }}
              >
                {errorMsg}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
