'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageCode, ConversationMode, PronunciationScore } from '@/types';
import { MainCircle } from '@/components/MainCircle';
import { getLanguage } from '@/lib/languages';
import { useAutoListen } from '@/lib/useAutoListen';
import { evaluatePronunciation, shouldRepeat, hasMastered } from '@/lib/pronunciation';
import { translateText } from '@/lib/agent';
import { Languages, MicOff, Volume2, Flame, Check } from 'lucide-react';
import { loadProgress, recordMastery, masteredToday, Progress, DAILY_GOAL } from '@/lib/progress';
import { scheduleReview, getDueReview } from '@/lib/review';

// Caché de audio en el cliente: repetir una frase no vuelve a pedir TTS
const clientTtsCache = new Map<string, ArrayBuffer>();
const CLIENT_TTS_MAX = 30;

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
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const pendingAudioRef = useRef<HTMLAudioElement | null>(null);
  const translatedRef = useRef('');
  const nativeRef = useRef(''); // la frase en tu idioma (para el repaso)
  const audioUnlockedRef = useRef(false);
  const lastProposalRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const busy = isProcessing || isSpeaking || showCelebration;
  busyRef.current = busy;

  const { permission, isCapturing, needsTouch, unlock, playAudioData, retryPermission } = useAutoListen({
    enabled: !busy,
    onSpeechEnd: blob => handleSpeech(blob),
  });

  // Repaso espaciado proactivo: en reposo, Pío te pide PRODUCIR una frase
  // pendiente ("¿Cómo se dice X?") — recall activo, la forma que enseña
  useEffect(() => {
    const t = setInterval(() => {
      if (busyRef.current) return;
      if (translatedRef.current) return; // ya hay frase en curso
      if (Date.now() - lastProposalRef.current < 90_000) return;
      const due = getDueReview();
      if (!due) return;

      lastProposalRef.current = Date.now();
      translatedRef.current = due.target;
      nativeRef.current = due.native;
      setTranslatedText(due.target);
      setCurrentText(due.native);
      setDetectedLanguage(null);
      setMode('translation');
      setPhase('done');
      void speak(
        due.native
          ? `Repasemos. ¿Cómo se dice: ${due.native}?`
          : 'Repasemos esta frase. Escucha y repite.',
        userLanguage
      ).then(() => {
        if (!due.native) return speak(due.target, targetLanguage);
      });
    }, 12_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Regla de Pío: idioma natal → traduce; idioma objetivo → evalúa.
    // El servidor desambigua el acento comparando contra la frase pendiente
    // (si la hay), así que aquí solo seguimos su decisión.
    setMode('detection');
    setPhase('transcribing');
    setIsProcessing(true);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', audioBlob, `speech.${ext}`);
      formData.append('target', targetLanguage);
      formData.append('native', userLanguage);
      if (translatedRef.current) {
        formData.append('expected', translatedRef.current);
      }

      const response = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (!data.text) {
        setPhase('idle');
        return;
      }

      if (data.intent === 'evaluate') {
        setCurrentText(data.text);
        setDetectedLanguage(targetLanguage);
        setMode('evaluation');
        setPhase('evaluating');
        // El servidor ya transcribió con Whisper: evaluar sobre ese texto
        // evita una pasada extra de audio (respuesta casi instantánea)
        await evaluateUserPronunciation(data.text);
        setPhase('done');
      } else {
        await routeByLanguage(data.text, data.language || userLanguage);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setPhase('idle');
      setErrorMsg('Hubo un problema procesando tu voz. Sigue hablando, te escucho.');
    } finally {
      setIsProcessing(false);
    }
  };

  const routeByLanguage = async (text: string, detected: LanguageCode) => {
    setCurrentText(text);
    setDetectedLanguage(detected);

    if (detected === targetLanguage) {
      setMode('evaluation');
      setPhase('evaluating');
      await evaluateUserPronunciation(text);
    } else {
      setMode('translation');
      setPhase('translating');
      const translated = await translateText(text, targetLanguage, userLanguage);
      setTranslatedText(translated);
      translatedRef.current = translated;
      nativeRef.current = text;
      await speak(translated);
    }
    setPhase('done');
  };

  const evaluateUserPronunciation = async (userText: string) => {
    const targetText = translatedRef.current || userText;
    const score = await evaluatePronunciation(null, targetText, targetLanguage, userText, userLanguage);
    setPronunciationScore(score);

    if (hasMastered(score.score)) {
      const updated = recordMastery(targetText);
      setProgress(updated);
      scheduleReview(nativeRef.current, targetText, true);
      playCelebrationSound();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2200);
      const today = masteredToday(updated);
      await speak(
        today === DAILY_GOAL
          ? '¡Meta del día cumplida! Tres frases dominadas.'
          : score.score >= 9
          ? '¡Excelente! Lo dominaste.'
          : '¡Muy bien! Lo lograste.',
        userLanguage
      );
      setTimeout(() => resetTurn(), 800);
    } else {
      scheduleReview(nativeRef.current, targetText, false);
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
      const cacheKey = `${lang}:${text}`;
      let data = clientTtsCache.get(cacheKey);
      if (!data) {
        const response = await fetch('/api/elevenlabs-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId: getLanguage(lang).elevenLabsVoiceId,
            model: 'eleven_multilingual_v2',
          }),
        });
        if (!response.ok) {
          // Sin voz (ej. cuota agotada): la app sigue funcionando en texto
          setErrorMsg('La voz no está disponible ahora — lee la frase en pantalla.');
          return;
        }
        data = await response.arrayBuffer();
        clientTtsCache.set(cacheKey, data);
        if (clientTtsCache.size > CLIENT_TTS_MAX) {
          clientTtsCache.delete(clientTtsCache.keys().next().value!);
        }
      }

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
    nativeRef.current = '';
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

        <div className="flex items-center gap-2">
          {progress && (progress.streak > 0 || progress.mastered > 0) && (
            <div
              className="glass rounded-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-300 tabular-nums"
              title={`Racha de ${progress.streak} día(s) · ${progress.mastered} frases dominadas`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" aria-hidden />
              {progress.streak}
              <span className="text-slate-600">·</span>
              <Check className="w-3.5 h-3.5 text-green-300" aria-hidden />
              {progress.mastered}
              <span className="text-slate-600">·</span>
              <span className={masteredToday(progress) >= DAILY_GOAL ? 'text-[#f5c86b]' : ''}>
                hoy {Math.min(masteredToday(progress), DAILY_GOAL)}/{DAILY_GOAL}
              </span>
            </div>
          )}
          <button
            onClick={onChangeLanguages}
            className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
            aria-label="Cambiar idiomas"
          >
            <Languages className="w-4 h-4 text-slate-400" />
            {getLanguage(targetLanguage).name}
          </button>
        </div>
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
                {/* Feedback visual palabra por palabra (estilo ELSA):
                    verde = bien, ámbar = mejorable, rojo = falló.
                    Tocar una palabra la reproduce sola. */}
                {pronunciationScore.words && pronunciationScore.words.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1.5 my-2">
                    {pronunciationScore.words.map((w, i) => (
                      <button
                        key={`${w.word}-${i}`}
                        onClick={() => speak(w.word, targetLanguage)}
                        aria-label={`Escuchar "${w.word}"`}
                        className={`text-xl font-medium tracking-tight transition-transform active:scale-95 ${
                          w.quality === 'good'
                            ? 'text-green-300'
                            : w.quality === 'weak'
                            ? 'text-amber-300 underline decoration-dotted decoration-amber-300/60 underline-offset-4'
                            : 'text-red-300 underline decoration-wavy decoration-red-300/70 underline-offset-4'
                        }`}
                      >
                        {w.word}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-sm text-slate-300">{pronunciationScore.feedback}</p>

                {pronunciationScore.words &&
                  pronunciationScore.words.some(w => w.quality !== 'good') && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Toca una palabra para escucharla sola
                    </p>
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
