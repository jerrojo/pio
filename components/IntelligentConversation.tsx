'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { LanguageCode, ConversationMode, PronunciationScore } from '@/types';
import { MainCircle } from '@/components/MainCircle';
import { getLanguage } from '@/lib/languages';
import { t, langName } from '@/lib/i18n';
import { useAutoListen } from '@/lib/useAutoListen';
import { evaluatePronunciation, hasMastered } from '@/lib/pronunciation';
import { translateText } from '@/lib/agent';
import { Languages, MicOff, Volume2, Check } from 'lucide-react';
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
  // Drill por etapas: ROJAS una por una → AMARILLAS juntas → frase completa
  const [drillWord, setDrillWord] = useState<string | null>(null);
  const [drillStage, setDrillStage] = useState<'red' | 'amber' | null>(null);
  const drillWordRef = useRef<string | null>(null);
  const drillQueueRef = useRef<string[]>([]);   // rojas pendientes
  const amberGroupRef = useRef<string[]>([]);   // amarillas para el conjunto
  const phraseFailsRef = useRef(0);             // fallos de la frase completa
  const itemFailsRef = useRef(0);               // fallos del elemento en drill

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

  // Auto-actualización: si hay una versión nueva desplegada, recarga al
  // volver a la pestaña (en reposo). Evita sesiones con código viejo.
  useEffect(() => {
    let current: string | null = null;
    const check = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        const { v } = await r.json();
        if (!current) current = v;
        else if (v && v !== current && !busyRef.current) window.location.reload();
      } catch {
        /* offline: ignorar */
      }
    };
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(check, 5 * 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
  }, []);

  // Repaso espaciado proactivo: en reposo, Pío te pide PRODUCIR una frase
  // pendiente ("¿Cómo se dice X?") — recall activo, la forma que enseña
  useEffect(() => {
    const timer = setInterval(() => {
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
          ? t(userLanguage, 'speakReviewAsk', { phrase: due.native })
          : t(userLanguage, 'speakReviewListen'),
        userLanguage
      ).then(() => {
        if (!due.native) return speak(due.target, targetLanguage);
      });
    }, 12_000);
    return () => clearInterval(timer);
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
      if (drillWordRef.current) {
        formData.append('expected', drillWordRef.current);
      } else if (translatedRef.current) {
        formData.append('expected', translatedRef.current);
      }

      const response = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (!data.text) {
        setPhase('idle');
        setErrorMsg(t(userLanguage, 'errNotHeard'));
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
        // Frase nueva en tu idioma: el turno anterior (y su drill) se disuelve
        if (drillWordRef.current) {
          drillWordRef.current = null;
          setDrillWord(null);
          setDrillStage(null);
          drillQueueRef.current = [];
          amberGroupRef.current = [];
          itemFailsRef.current = 0;
          phraseFailsRef.current = 0;
        }
        await routeByLanguage(data.text, data.language || userLanguage);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setPhase('idle');
      setErrorMsg(t(userLanguage, 'errProcessing'));
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

  const cleanWord = (w: string) =>
    w.replace(/^[¿¡"'«(]+/u, '').replace(/[.,!?…"'»)]+$/u, '');

  const evaluateUserPronunciation = async (userText: string) => {
    // ── Modo práctica aislada: solo la palabra roja en turno ──
    if (drillWordRef.current) {
      const item = drillWordRef.current;
      const phrase = translatedRef.current;
      const wantCoach = itemFailsRef.current >= 2; // consejo al 3er intento

      // Oído abierto: aunque el foco sea una palabra, se evalúa en paralelo
      // contra la frase completa. Se califica lo que REALMENTE dijiste.
      const [s, sPhrase] = await Promise.all([
        evaluatePronunciation(null, item, targetLanguage, userText, userLanguage, wantCoach),
        phrase && cleanWord(phrase).toLowerCase() !== item.toLowerCase()
          ? evaluatePronunciation(null, phrase, targetLanguage, userText, userLanguage, false)
          : Promise.resolve(null),
      ]);

      if (sPhrase && (sPhrase.passed || sPhrase.score > s.score)) {
        // Dijiste la frase (o más que la palabra): el drill se disuelve
        // y se califica la frase completa tal como salió
        drillWordRef.current = null;
        setDrillWord(null);
        setDrillStage(null);
        drillQueueRef.current = [];
        amberGroupRef.current = [];
        itemFailsRef.current = 0;
        await finishPhraseEvaluation(sPhrase, phrase);
        return;
      }

      setPronunciationScore(s);
      setPhase('done');

      if (s.score >= 6) {
        itemFailsRef.current = 0;
        const next = drillQueueRef.current.shift();
        if (next) {
          // siguiente ROJA
          drillWordRef.current = next;
          setDrillWord(next);
          setDrillStage('red');
          await speak(t(userLanguage, 'speakNextWord'), userLanguage);
          await speak(next, targetLanguage);
        } else if (amberGroupRef.current.length > 0) {
          // AMARILLAS: todas juntas
          const chunk = amberGroupRef.current.join(' ');
          amberGroupRef.current = [];
          drillWordRef.current = chunk;
          setDrillWord(chunk);
          setDrillStage('amber');
          await speak(t(userLanguage, 'speakTogether'), userLanguage);
          await speak(chunk, targetLanguage);
        } else {
          // de vuelta a la frase completa
          drillWordRef.current = null;
          setDrillWord(null);
          setDrillStage(null);
          await speak(t(userLanguage, 'speakFullPhrase'), userLanguage);
          if (translatedRef.current) await speak(translatedRef.current, targetLanguage);
        }
      } else {
        itemFailsRef.current += 1;
        await speak(s.feedback || t(userLanguage, 'speakListenAgain'), userLanguage);
        await speak(item, targetLanguage);
      }
      return;
    }

    const targetText = translatedRef.current || userText;
    const score = await evaluatePronunciation(null, targetText, targetLanguage, userText, userLanguage, phraseFailsRef.current >= 2);
    await finishPhraseEvaluation(score, targetText);
  };

  /** Flujo de resultado de la frase completa (pase o ciclo de drill) */
  const finishPhraseEvaluation = async (score: PronunciationScore, targetText: string) => {
    setPronunciationScore(score);
    setPhase('done'); // la evaluación terminó; lo que sigue es feedback

    const passed = score.passed ?? hasMastered(score.score);
    if (passed) {
      phraseFailsRef.current = 0;
      const updated = recordMastery(targetText);
      setProgress(updated);
      scheduleReview(nativeRef.current, targetText, true);
      playCelebrationSound();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2200);
      const today = masteredToday(updated);
      await speak(
        today === DAILY_GOAL
          ? t(userLanguage, 'speakDailyGoal')
          : score.score >= 9
          ? t(userLanguage, 'speakExcellent')
          : t(userLanguage, 'speakWellDone'),
        userLanguage
      );
      setTimeout(() => resetTurn(), 800);
    } else {
      scheduleReview(nativeRef.current, targetText, false);
      phraseFailsRef.current += 1;
      itemFailsRef.current = 0;

      const reds = (score.words ?? [])
        .filter(w => w.quality === 'bad')
        .map(w => cleanWord(w.word))
        .filter(Boolean);
      const ambers = (score.words ?? [])
        .filter(w => w.quality === 'weak')
        .map(w => cleanWord(w.word))
        .filter(Boolean);

      // La pantalla ya muestra lo que dijiste vs. la frase coloreada;
      // el consejo largo del coach solo llega al tercer fallo
      if (reds.length > 0) {
        drillQueueRef.current = reds.slice(1);
        amberGroupRef.current = ambers;
        const first = reds[0];
        drillWordRef.current = first;
        setDrillWord(first);
        setDrillStage('red');
        await speak(
          phraseFailsRef.current >= 3 && score.feedback
            ? score.feedback
            : t(userLanguage, 'speakByParts'),
          userLanguage
        );
        await speak(first, targetLanguage);
      } else if (ambers.length > 0) {
        const chunk = ambers.join(' ');
        drillWordRef.current = chunk;
        setDrillWord(chunk);
        setDrillStage('amber');
        await speak(t(userLanguage, 'speakAlmostTogether'), userLanguage);
        await speak(chunk, targetLanguage);
      } else {
        await speak(score.feedback || t(userLanguage, 'speakTryAgain'), userLanguage);
        if (translatedRef.current) await speak(translatedRef.current, targetLanguage);
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
          // Sin ElevenLabs (ej. cuota agotada): fallback a la voz del sistema
          if ('speechSynthesis' in window) {
            try {
              const locale = getLanguage(lang).locale;
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = locale;
              utterance.rate = 0.95;
              const voice = window.speechSynthesis
                .getVoices()
                .find(v => v.lang.startsWith(locale));
              if (voice) utterance.voice = voice;
              // Crítico: esperar a que TERMINE para no reactivar el mic antes
              await new Promise<void>(resolve => {
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                window.speechSynthesis.speak(utterance);
              });
              return;
            } catch {
              // cae al toast de abajo
            }
          }
          // Sin voz posible: la app sigue funcionando en texto
          setErrorMsg(t(userLanguage, 'errNoVoice'));
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
    drillWordRef.current = null;
    setDrillWord(null);
    setDrillStage(null);
    drillQueueRef.current = [];
    amberGroupRef.current = [];
    phraseFailsRef.current = 0;
    itemFailsRef.current = 0;
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

  const phaseLabels: Record<Exclude<Phase, 'idle' | 'done'>, string> = {
    listening: t(userLanguage, 'phaseListening'),
    transcribing: t(userLanguage, 'phaseTranscribing'),
    translating: t(userLanguage, 'phaseTranslating'),
    evaluating: t(userLanguage, 'phaseEvaluating'),
  };

  const statusLabel = isCapturing
    ? phaseLabels.listening
    : phase !== 'idle' && phase !== 'done'
    ? phaseLabels[phase]
    : isSpeaking
    ? t(userLanguage, 'repeatAfterMe')
    : null;

  // Nombres para el hint: minúsculas salvo en alemán (los sustantivos van en mayúscula)
  const hintName = (code: LanguageCode) => {
    const n = langName(userLanguage, code);
    return userLanguage === 'de' ? n : n.toLowerCase();
  };

  const aiActive = isCapturing || isProcessing || isSpeaking;

  // ── Permiso de micrófono ──
  if (permission === 'denied') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="glass rounded-3xl p-8 text-center max-w-sm">
          <MicOff className="w-10 h-10 mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-medium tracking-tight text-white mb-2">
            {t(userLanguage, 'micTitle')}
          </h2>
          <p className="text-slate-400 text-sm mb-6">{t(userLanguage, 'micBody')}</p>
          <button onClick={retryPermission} className="btn-primary w-full px-6 py-3">
            {t(userLanguage, 'micAllow')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
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
          {progress && (progress.mastered > 0 || masteredToday(progress) > 0) && (
            <div
              className="glass rounded-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-300 tabular-nums"
              title={t(userLanguage, 'masteredTitle', { n: progress.mastered })}
            >
              <Check className="w-3.5 h-3.5 text-green-300" aria-hidden />
              {progress.mastered}
              <span className="text-slate-600">·</span>
              <span className={masteredToday(progress) >= DAILY_GOAL ? 'text-[#f5c86b]' : ''}>
                {t(userLanguage, 'todayChip', {
                  n: Math.min(masteredToday(progress), DAILY_GOAL),
                  goal: DAILY_GOAL,
                })}
              </span>
            </div>
          )}
          <button
            onClick={onChangeLanguages}
            className="glass rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
            aria-label={t(userLanguage, 'ariaChangeLanguages')}
          >
            <Languages className="w-4 h-4 text-slate-400" />
            {langName(userLanguage, targetLanguage)}
          </button>
        </div>
      </header>

      {/* Centro: solo el orbe */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10 max-w-2xl w-full mx-auto">
        <button
          onClick={handleOrbTap}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b9cf9]/60"
          aria-label={
            needsAudioUnlock ? t(userLanguage, 'ariaUnlockAudio') : t(userLanguage, 'ariaNewPhrase')
          }
        >
          <MainCircle
            mode={mode}
            score={pronunciationScore?.score}
            passed={pronunciationScore?.passed}
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
                className="text-sm font-medium text-signal"
              >
                {t(userLanguage, 'orbTouchStart')}
              </motion.button>
            ) : permission === 'pending' ? (
              <motion.p
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-slate-400"
              >
                {t(userLanguage, 'micActivating')}
              </motion.p>
            ) : needsAudioUnlock ? (
              <motion.p
                key="unlock"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-signal"
              >
                {t(userLanguage, 'orbTouchHear')}
              </motion.p>
            ) : statusLabel ? (
              <motion.p
                key={statusLabel}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm font-medium text-signal"
              >
                {statusLabel}…
              </motion.p>
            ) : (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-slate-400"
              >
                {t(userLanguage, 'idleHint', {
                  native: hintName(userLanguage),
                  target: hintName(targetLanguage),
                })}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Práctica aislada activa */}
        <AnimatePresence>
          {drillWord && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 w-full max-w-md glass rounded-3xl px-6 py-5 flex flex-col items-center gap-2.5 text-center"
              style={{
                borderColor:
                  drillStage === 'amber' ? 'rgba(246,178,107,0.45)' : 'rgba(248,113,113,0.4)',
              }}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                  drillStage === 'amber' ? 'text-amber-200/90' : 'text-red-200/90'
                }`}
              >
                {drillStage === 'amber' ? t(userLanguage, 'drillTogether') : t(userLanguage, 'drillIsolated')}
              </span>
              <motion.button
                key={drillWord}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.94 }}
                onClick={() => speak(drillWord, targetLanguage)}
                className="text-3xl sm:text-4xl font-medium tracking-tight text-white leading-tight"
                aria-label={t(userLanguage, 'ariaListenWord', { word: drillWord })}
              >
                {drillWord}
              </motion.button>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Volume2 className="w-3.5 h-3.5" aria-hidden />
                {t(userLanguage, 'drillTapWord')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversación */}
        <div className="w-full max-w-md mt-8 space-y-3">
          <AnimatePresence>
            {currentText && (
              <motion.div
                key="user-text"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="glass rounded-2xl p-4"
              >
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                  {t(userLanguage, 'heardLabel')}
                  {detectedLanguage ? ` · ${langName(userLanguage, detectedLanguage)}` : ''}
                </p>
                <p className="text-slate-100">{currentText}</p>
              </motion.div>
            )}

            {translatedText && mode === 'translation' && (
              <motion.div
                key="translation"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                className="glass rounded-2xl p-4"
                style={{ borderColor: 'rgba(139,156,249,0.45)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {langName(userLanguage, targetLanguage)} {t(userLanguage, 'repeatAloudSuffix')}
                  </p>
                  <button
                    onClick={() => speak(translatedText)}
                    className="text-slate-300 hover:text-white transition-colors"
                    aria-label={t(userLanguage, 'ariaListenAgain')}
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="glass rounded-2xl p-4"
                style={{
                  borderColor: !(pronunciationScore.passed ?? pronunciationScore.score >= 7)
                    ? 'rgba(248,113,113,0.35)'
                    : pronunciationScore.score < 9
                    ? 'rgba(246,178,107,0.35)'
                    : 'rgba(74,222,128,0.35)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">
                    {!(pronunciationScore.passed ?? pronunciationScore.score >= 7)
                      ? t(userLanguage, 'resultAlmost')
                      : pronunciationScore.score < 9
                      ? t(userLanguage, 'resultGood')
                      : t(userLanguage, 'resultExcellent')}
                  </span>
                  <motion.span
                    key={pronunciationScore.score}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={`text-xl font-semibold tabular-nums ${
                      pronunciationScore.score < 7
                        ? 'text-red-300'
                        : pronunciationScore.score < 9
                        ? 'text-amber-300'
                        : 'text-green-300'
                    }`}
                  >
                    {pronunciationScore.score}/10
                  </motion.span>
                </div>
                {/* Feedback visual palabra por palabra (estilo ELSA):
                    verde = bien, ámbar = mejorable, rojo = falló.
                    Tocar una palabra la reproduce sola. */}
                {pronunciationScore.words && pronunciationScore.words.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1.5 my-2">
                    {pronunciationScore.words.map((w, i) => (
                      <motion.button
                        key={`${w.word}-${i}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.03 }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => speak(w.word, targetLanguage)}
                        aria-label={t(userLanguage, 'ariaListenWord', { word: w.word })}
                        className={`text-xl font-medium tracking-tight ${
                          w.quality === 'good'
                            ? 'text-green-300'
                            : w.quality === 'weak'
                            ? 'text-amber-300 underline decoration-dotted decoration-amber-300/60 underline-offset-4'
                            : 'text-red-300 underline decoration-wavy decoration-red-300/70 underline-offset-4'
                        }`}
                      >
                        {w.word}
                      </motion.button>
                    ))}
                  </div>
                )}

                {pronunciationScore.heardText && (
                  <p className="text-xs text-slate-400 mb-1.5">
                    {t(userLanguage, 'youSaid')}{' '}
                    <span className="text-slate-400 italic">"{pronunciationScore.heardText}"</span>
                  </p>
                )}
                <p className="text-sm text-slate-300">{pronunciationScore.feedback}</p>

                {pronunciationScore.words &&
                  pronunciationScore.words.some(w => w.quality !== 'good') && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      {t(userLanguage, 'tapWordSolo')}
                    </p>
                  )}

                {!(pronunciationScore.passed ?? pronunciationScore.score >= 7) && (
                  <p className="mt-3 text-xs text-slate-400">
                    {t(userLanguage, 'sayAgainHint')}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error toast */}
        <AnimatePresence>
          {errorMsg && (
            <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-6 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
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
    </MotionConfig>
  );
}
