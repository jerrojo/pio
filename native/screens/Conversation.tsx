import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { LanguageCode, PronunciationScore } from '../lib/types';
import { getLanguage } from '../lib/languages';
import { langName, t } from '../lib/i18n';
import { evaluatePronunciation, speechToText, translateText } from '../lib/api';
import { speak, stopSpeaking } from '../lib/tts';
import { DAILY_GOAL, Progress, loadProgress, masteredToday, recordMastery } from '../lib/progress';
import { scheduleReview } from '../lib/review';
import { Orb, OrbState } from '../components/Orb';
import { colors } from '../lib/theme';

interface Props {
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onChangeLanguages: () => void;
}

type Phase = 'idle' | 'recording' | 'transcribing' | 'translating' | 'evaluating' | 'speaking' | 'done';

const QUALITY_COLOR = {
  good: colors.good,
  weak: colors.weak,
  bad: colors.bad,
} as const;

/**
 * Conversación v1 nativa, honesta: push-to-talk (mantén presionado para
 * grabar, suelta para enviar). El manos-libres con VAD llega después.
 * Regla de Pío intacta: tu idioma → traduce; el objetivo → evalúa.
 */
export function Conversation({ userLanguage, targetLanguage, onChangeLanguages }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [heardText, setHeardText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [score, setScore] = useState<PronunciationScore | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const translatedRef = useRef('');
  const nativeRef = useRef('');
  const busyRef = useRef(false);

  useEffect(() => {
    void loadProgress().then(setProgress);
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  const startRecording = async () => {
    if (busyRef.current) return;
    try {
      stopSpeaking();
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setErrorMsg(t(userLanguage, 'micBody'));
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setPhase('recording');
    } catch {
      setErrorMsg(t(userLanguage, 'errProcessing'));
      setPhase('idle');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;
    try {
      setPhase('transcribing');
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) {
        setPhase('idle');
        setErrorMsg(t(userLanguage, 'errNotHeard'));
        return;
      }
      await handleSpeech(uri);
    } catch {
      setPhase('idle');
      setErrorMsg(t(userLanguage, 'errProcessing'));
    }
  };

  /** Misma lógica de intents que la web: el servidor decide la ruta */
  const handleSpeech = async (audioUri: string) => {
    busyRef.current = true;
    try {
      const data = await speechToText(
        audioUri,
        targetLanguage,
        userLanguage,
        translatedRef.current || undefined
      );
      if (data.error) throw new Error(data.error);

      if (!data.text) {
        setPhase('idle');
        setErrorMsg(t(userLanguage, 'errNotHeard'));
        return;
      }

      if (data.intent === 'evaluate' || data.language === targetLanguage) {
        await evaluateAttempt(data.text);
      } else {
        await translateTurn(data.text);
      }
    } catch {
      setPhase('idle');
      setErrorMsg(t(userLanguage, 'errProcessing'));
    } finally {
      busyRef.current = false;
    }
  };

  /** Frase nueva en tu idioma → traducir, mostrar y decir en voz alta */
  const translateTurn = async (text: string) => {
    setHeardText(text);
    setScore(null);
    setPhase('translating');
    const translated = await translateText(text, targetLanguage, userLanguage);
    setTranslatedText(translated);
    translatedRef.current = translated;
    nativeRef.current = text;
    setPhase('speaking');
    await speak(translated, targetLanguage);
    setPhase('done');
  };

  /** Intento en el idioma objetivo → evaluar con passed/words */
  const evaluateAttempt = async (spokenText: string) => {
    setHeardText(spokenText);
    setPhase('evaluating');
    const targetText = translatedRef.current || spokenText;
    const result = await evaluatePronunciation(
      targetText,
      targetLanguage,
      spokenText,
      userLanguage
    );
    setScore(result);
    setPhase('speaking');

    const passed = result.passed ?? result.score >= 7;
    if (passed) {
      const updated = await recordMastery(targetText);
      setProgress(updated);
      await scheduleReview(nativeRef.current, targetText, true);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2200);
      await speak(
        masteredToday(updated) === DAILY_GOAL
          ? t(userLanguage, 'speakDailyGoal')
          : result.score >= 9
          ? t(userLanguage, 'speakExcellent')
          : t(userLanguage, 'speakWellDone'),
        userLanguage
      );
      translatedRef.current = '';
      nativeRef.current = '';
    } else {
      await scheduleReview(nativeRef.current, targetText, false);
      await speak(result.feedback || t(userLanguage, 'speakTryAgain'), userLanguage);
      if (translatedRef.current) await speak(translatedRef.current, targetLanguage);
    }
    setPhase('done');
  };

  const orbState: OrbState =
    phase === 'recording'
      ? 'recording'
      : phase === 'transcribing' || phase === 'translating' || phase === 'evaluating'
      ? 'thinking'
      : phase === 'speaking'
      ? 'speaking'
      : 'idle';

  const statusLine =
    phase === 'recording'
      ? t(userLanguage, 'recordingNow')
      : phase === 'transcribing'
      ? t(userLanguage, 'phaseTranscribing')
      : phase === 'translating'
      ? t(userLanguage, 'phaseTranslating')
      : phase === 'evaluating'
      ? t(userLanguage, 'phaseEvaluating')
      : translatedRef.current
      ? t(userLanguage, 'repeatAfterMe')
      : t(userLanguage, 'idleHint', {
          native: langName(userLanguage, userLanguage),
          target: langName(userLanguage, targetLanguage),
        });

  const passed = score ? score.passed ?? score.score >= 7 : false;
  const resultLabel = !score
    ? ''
    : passed && score.score >= 9
    ? t(userLanguage, 'resultExcellent')
    : passed
    ? t(userLanguage, 'resultGood')
    : t(userLanguage, 'resultAlmost');
  const resultColor = !score
    ? colors.textDim
    : passed && score.score >= 9
    ? colors.gold
    : passed
    ? colors.good
    : colors.weak;

  return (
    <View style={styles.screen}>
      {/* Header: par de idiomas + meta diaria */}
      <View style={styles.header}>
        <Pressable
          onPress={onChangeLanguages}
          accessibilityLabel={t(userLanguage, 'ariaChangeLanguages')}
          style={styles.pairBtn}
        >
          <Text style={styles.pairText}>
            {getLanguage(userLanguage).flag}  {'→'}  {getLanguage(targetLanguage).flag}
          </Text>
        </Pressable>
        {progress ? (
          <View style={styles.todayChip}>
            <Text style={[styles.todayText, celebrating && { color: colors.gold }]}>
              {t(userLanguage, 'todayChip', {
                n: masteredToday(progress),
                goal: DAILY_GOAL,
              })}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.orbZone}>
          <Orb state={orbState} />
          <Text style={styles.status}>{statusLine}</Text>
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        </View>

        {/* Tarjeta "Escuché" */}
        {heardText ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t(userLanguage, 'heardLabel')}</Text>
            <Text style={styles.cardText}>{heardText}</Text>
          </View>
        ) : null}

        {/* Tarjeta de traducción (frase a practicar) */}
        {translatedText && !score ? (
          <View style={[styles.card, styles.cardAccent]}>
            <Text style={[styles.cardLabel, { color: colors.iris }]}>
              {getLanguage(targetLanguage).flag}  {langName(userLanguage, targetLanguage)}
            </Text>
            <Text style={styles.translatedText}>{translatedText}</Text>
            <Text style={styles.cardHint}>{t(userLanguage, 'repeatAloudSuffix')}</Text>
          </View>
        ) : null}

        {/* Tarjeta de feedback con palabras coloreadas */}
        {score ? (
          <View style={styles.card}>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: resultColor }]}>{resultLabel}</Text>
              <Text style={styles.scoreText}>{Math.round(score.score)}/10</Text>
            </View>
            {score.words && score.words.length > 0 ? (
              <View style={styles.wordsRow}>
                {score.words.map((w, i) => (
                  <Text key={`${w.word}-${i}`} style={[styles.word, { color: QUALITY_COLOR[w.quality] }]}>
                    {w.word}
                  </Text>
                ))}
              </View>
            ) : null}
            {score.heardText ? (
              <Text style={styles.cardHint}>
                {t(userLanguage, 'youSaid')} {score.heardText}
              </Text>
            ) : null}
            {!passed && score.feedback ? (
              <Text style={styles.feedback}>{score.feedback}</Text>
            ) : null}
            {!passed ? (
              <Text style={styles.cardHint}>{t(userLanguage, 'sayAgainHint')}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Botón GRANDE push-to-talk */}
      <View style={styles.footer}>
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={busyRef.current && phase !== 'recording'}
          style={({ pressed }) => [styles.talkBtn, pressed && styles.talkBtnActive]}
        >
          <Text style={styles.talkText}>
            {phase === 'recording'
              ? t(userLanguage, 'recordingNow')
              : t(userLanguage, 'holdToTalk')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pairBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  pairText: { color: colors.textDim, fontSize: 15 },
  todayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  todayText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 24 },
  orbZone: { alignItems: 'center', paddingVertical: 28 },
  status: {
    color: colors.textDim,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  error: {
    color: colors.weak,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
  },
  cardAccent: { borderColor: 'rgba(139,156,249,0.35)' },
  cardLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardText: { color: colors.text, fontSize: 17, lineHeight: 24 },
  translatedText: { color: colors.text, fontSize: 22, fontWeight: '600', lineHeight: 30 },
  cardHint: { color: colors.textFaint, fontSize: 13, marginTop: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: { fontSize: 16, fontWeight: '700' },
  scoreText: { color: colors.textFaint, fontSize: 13, fontWeight: '600' },
  wordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  word: { fontSize: 20, fontWeight: '600', lineHeight: 30 },
  feedback: { color: colors.textDim, fontSize: 14, lineHeight: 21, marginTop: 10 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  talkBtn: {
    borderRadius: 999,
    paddingVertical: 22,
    alignItems: 'center',
    backgroundColor: 'rgba(139,156,249,0.14)',
    borderWidth: 1,
    borderColor: colors.iris,
  },
  talkBtnActive: { backgroundColor: colors.iris },
  talkText: { color: colors.text, fontSize: 17, fontWeight: '700' },
});
