'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageCode, ConversationMode, PronunciationScore } from '@/types';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { MainCircle } from '@/components/MainCircle';
import { getLanguage } from '@/lib/languages';
import { evaluatePronunciation, getScoreColor, shouldRepeat, hasMastered, canChallenge } from '@/lib/pronunciation';
import { translateText, generateAgentResponse } from '@/lib/agent';
import { SkipForward, Trophy, Volume2 } from 'lucide-react';

interface IntelligentConversationProps {
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export function IntelligentConversation({ userLanguage, targetLanguage }: IntelligentConversationProps) {
  const [mode, setMode] = useState<ConversationMode>('detection');
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [pronunciationScore, setPronunciationScore] = useState<PronunciationScore | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Auto-alternate between Translation and Evaluation modes
    if (mode === 'translation' && pronunciationScore && hasMastered(pronunciationScore.score)) {
      setTimeout(() => {
        setMode('detection');
        setPronunciationScore(null);
      }, 3000);
    }
  }, [mode, pronunciationScore]);

  const detectLanguage = async (text: string): Promise<LanguageCode> => {
    // Detección por texto (fallback Web Speech). El flujo principal
    // detecta idioma directamente del audio con Whisper.
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
      // Evaluation Mode
      setMode('evaluation');
      await evaluateUserPronunciation(text, audioBlob);
    } else {
      // Translation Mode
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
    // Flujo principal: Whisper transcribe Y detecta el idioma en una llamada
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
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const translateAndSpeak = async (text: string) => {
    // Translate to target language
    const translated = await translateText(text, targetLanguage, userLanguage);
    setTranslatedText(translated);

    // Play with ElevenLabs (neutral female voice, 21 yo)
    await playElevenLabsAudio(translated);
  };

  const evaluateUserPronunciation = async (userText: string, audioBlob?: Blob) => {
    // Get target text for comparison
    const targetText = translatedText || userText;

    // Whisper evalúa desde el audio; si solo hay texto (fallback), se
    // compara la transcripción de Web Speech contra el objetivo
    const score = await evaluatePronunciation(audioBlob ?? null, targetText, targetLanguage, userText);
    
    setPronunciationScore(score);
    setInteractionCount(prev => prev + 1);

    if (hasMastered(score.score)) {
      playCelebrationSound();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      
      // Auto-continue after 3 seconds
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
    // Play chime sound
    const audio = new Audio('/sounds/celebration.mp3');
    audio.play().catch(() => {
      // Fallback: use Web Audio API to generate chime
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = 523.25; // C5
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex flex-col items-center justify-center px-6 py-12">
      {/* Main Circle */}
      <div className="mb-12">
        <MainCircle
          mode={mode}
          score={pronunciationScore?.score}
          isListening={isRecording || isProcessing}
        />
      </div>

      {/* Current Text Display */}
      <AnimatePresence>
        {currentText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6 max-w-md"
          >
            <p className="text-gray-800 text-lg text-center">{currentText}</p>
          </motion.div>
        )}

        {translatedText && mode === 'translation' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-lime-50 border-2 border-lime-200 rounded-2xl shadow-lg p-6 mb-6 max-w-md"
          >
            <p className="text-lime-900 text-lg text-center font-medium">{translatedText}</p>
            <p className="text-sm text-lime-700 text-center mt-2">
              {getLanguage(targetLanguage).name}
            </p>
          </motion.div>
        )}

        {showCelebration && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-yellow-400/20 z-50"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 360],
              }}
              className="text-8xl"
            >
              🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      {pronunciationScore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-xl p-4 mb-6 max-w-md ${
            pronunciationScore.score < 7
              ? 'bg-red-50 border-2 border-red-200'
              : pronunciationScore.score < 9
              ? 'bg-yellow-50 border-2 border-yellow-200'
              : 'bg-green-50 border-2 border-green-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">
              {pronunciationScore.score < 7 ? '🔴 Repite' : pronunciationScore.score < 9 ? '🟡 Bien' : '🟢 ¡Excelente!'}
            </span>
            <span className="text-2xl font-bold">{pronunciationScore.score}/10</span>
          </div>
          <p className="text-sm text-gray-700">{pronunciationScore.feedback}</p>
          
          {shouldRepeat(pronunciationScore.score) && (
            <button
              onClick={handleRepeat}
              className="mt-4 w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
            >
              Repetir
            </button>
          )}

          {canChallenge(pronunciationScore.score) && (
            <button
              onClick={() => {/* Challenge mode */}}
              className="mt-4 w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              ¿Ir por 9/10?
            </button>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          isRecording={isRecording}
          onStartRecording={() => setIsRecording(true)}
          onStopRecording={() => setIsRecording(false)}
          language={getLanguage(mode === 'evaluation' ? targetLanguage : userLanguage).locale}
          onTextRecognized={(text) => handleTextRecognized(text)}
        />

        <button
          onClick={handleSkip}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 flex items-center gap-2 transition-colors"
        >
          <SkipForward className="w-5 h-5" />
          Skip Class
        </button>
      </div>

      {/* Progress Indicator */}
      {interactionCount > 0 && interactionCount % 10 === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white rounded-xl shadow-lg p-4 max-w-md"
        >
          <p className="text-sm text-gray-600 text-center">
            📊 Progreso: +8% claridad después de {interactionCount} interacciones
          </p>
        </motion.div>
      )}
    </div>
  );
}

