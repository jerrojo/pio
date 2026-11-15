/**
 * Pío web restart: framework-independent rules. This module does not capture
 * audio or call an assessment provider. Adapters must supply measured evidence.
 */
export type Locale = 'es-MX' | 'es-ES' | 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'it-IT' | 'pt-PT' | 'pt-BR';
export type Reference = Readonly<{ id: string; text: string; locale: Locale }>;
export type Assessment = Readonly<{
  source: 'acoustic' | 'transcript';
  referenceId: string;
  audioId: string;
  locale: Locale;
  speechDetected: boolean;
  accuracy: number;
  completeness: number;
  words: ReadonlyArray<{ text: string; accuracy: number; omitted: boolean }>;
}>;
export type Decision = 'accepted' | 'practice' | 'unavailable';
export type Policy = Readonly<{ accuracy: number; wordAccuracy: number; completeness: number }>;
// Candidate thresholds for a measured pilot, not a validated learning standard.
export const PILOT_POLICY: Policy = { accuracy: 80, wordAccuracy: 70, completeness: 95 };
const percentage = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;

export function assessEvidence(
  reference: Reference, audioId: string, evidence: Assessment, policy: Policy = PILOT_POLICY,
): Decision {
  if (!Object.values(policy).every(percentage)) return 'unavailable';
  if (!reference.text.trim() || !audioId || evidence.source !== 'acoustic' ||
      evidence.referenceId !== reference.id || evidence.audioId !== audioId ||
      evidence.locale !== reference.locale || !evidence.speechDetected ||
      !percentage(evidence.accuracy) || !percentage(evidence.completeness) ||
      !evidence.words.length || evidence.words.some(w => !w.text.trim() || !percentage(w.accuracy))) {
    return 'unavailable';
  }
  return evidence.accuracy >= policy.accuracy && evidence.completeness >= policy.completeness &&
    evidence.words.every(w => !w.omitted && w.accuracy >= policy.wordAccuracy)
    ? 'accepted' : 'practice';
}

export type Intent = 'translate' | 'evaluate' | 'clarify' | 'reference-needed' | 'no-speech';
export function classifyTurn(input: {
  text: string; detectedLanguage: string | null; confidence: 'high' | 'uncertain';
  nativeLocale: Locale; targetLocale: Locale; reference: Reference | null;
  explicitIntent?: 'translate' | 'evaluate';
}): Intent {
  if (!input.text.trim()) return 'no-speech';
  const evaluate = (): Intent => input.reference?.text.trim() && input.reference.locale === input.targetLocale
    ? 'evaluate' : 'reference-needed';
  if (input.explicitIntent === 'translate') return 'translate';
  if (input.explicitIntent === 'evaluate') return evaluate();
  if (input.confidence !== 'high' || !input.detectedLanguage) return 'clarify';
  const language = input.detectedLanguage.split('-')[0];
  const native = input.nativeLocale.split('-')[0];
  const target = input.targetLocale.split('-')[0];
  if (native === target) return 'clarify';
  if (language === native) return 'translate';
  if (language === target) return evaluate();
  return 'clarify';
}

export type Phase = 'idle' | 'listening' | 'recording' | 'transcribing' | 'translating' |
  'speaking' | 'evaluating' | 'feedback' | 'paused' | 'error';
export type Session = Readonly<{
  epoch: number; turn: number; phase: Phase; token: string | null;
  reference: Reference | null; audioId: string | null;
  decision: Decision | null; issue: string | null;
}>;
export const initialSession = (): Session => ({
  epoch: 0, turn: 0, phase: 'idle', token: null, reference: null,
  audioId: null, decision: null, issue: null,
});
export type Event =
  | { type: 'start' | 'record' | 'pause' | 'reset' | 'retry' }
  | { type: 'captured'; token: string; audioId: string }
  | { type: 'classified'; token: string; intent: Intent }
  | { type: 'translated'; token: string; reference: Reference }
  | { type: 'playback-ended'; token: string }
  | { type: 'assessed'; token: string; evidence: Assessment }
  | { type: 'failed'; token: string; code: string };

/** Only one turn owns the session. Every asynchronous completion carries its token. */
export function transition(state: Session, event: Event): Session {
  if (event.type === 'reset') return { ...initialSession(), epoch: state.epoch + 1 };
  if (event.type === 'pause') return {
    ...state, epoch: state.epoch + 1, phase: 'paused', token: null,
    audioId: null, decision: null, issue: null,
  };
  if (event.type === 'start' || event.type === 'retry') {
    const allowed = event.type === 'start' ? ['idle', 'paused'] : ['error'];
    return allowed.includes(state.phase) ? {
      ...state, phase: 'listening', token: null, audioId: null, decision: null, issue: null,
    } : state;
  }
  if (event.type === 'record') {
    if (!['listening', 'feedback'].includes(state.phase)) return state;
    const turn = state.turn + 1;
    return { ...state, turn, token: `${state.epoch}:${turn}`, phase: 'recording',
      audioId: null, decision: null, issue: null };
  }
  if (!('token' in event) || !state.token || event.token !== state.token) return state;
  if (event.type === 'captured' && state.phase === 'recording') {
    return event.audioId.trim()
      ? { ...state, phase: 'transcribing', audioId: event.audioId }
      : { ...state, phase: 'error', token: null, issue: 'empty-audio' };
  }
  if (event.type === 'classified' && state.phase === 'transcribing') {
    if (event.intent === 'translate') return { ...state, phase: 'translating', reference: null };
    if (event.intent === 'evaluate' && state.reference) return { ...state, phase: 'evaluating' };
    return { ...state, phase: 'feedback', issue: event.intent === 'evaluate' ? 'reference-needed' : event.intent };
  }
  if (event.type === 'translated' && state.phase === 'translating') {
    if (!event.reference.id.trim() || !event.reference.text.trim()) {
      return { ...state, phase: 'error', token: null, issue: 'invalid-translation' };
    }
    return { ...state, reference: { ...event.reference }, phase: 'speaking' };
  }
  if (event.type === 'playback-ended' && state.phase === 'speaking') {
    return { ...state, phase: 'listening', token: null, audioId: null };
  }
  if (event.type === 'assessed' && state.phase === 'evaluating' && state.reference && state.audioId) {
    const decision = assessEvidence(state.reference, state.audioId, event.evidence);
    return { ...state, phase: 'feedback', decision,
      issue: decision === 'unavailable' ? 'assessment-unavailable' : null };
  }
  if (event.type === 'failed' && ['recording', 'transcribing', 'translating', 'speaking', 'evaluating'].includes(state.phase)) {
    return { ...state, phase: 'error', token: null, decision: null, issue: event.code };
  }
  return state;
}

export type MasteryEntry = Readonly<{
  attemptId: string; phrase: string; locale: Locale; day: string;
}>;
export type Progress = Readonly<{ version: 2; entries: ReadonlyArray<MasteryEntry> }>;
export const emptyProgress = (): Progress => ({ version: 2, entries: [] });
export function localDay(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
const phraseKey = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** attemptId must be a persisted UUID from the adapter, never a session-local counter. */
export function recordMastery(input: {
  progress: Progress; reference: Reference; audioId: string; evidence: Assessment;
  attemptId: string; at: Date; timeZone: string;
}): Progress {
  const { progress, reference, evidence, audioId, attemptId, at, timeZone } = input;
  if (!attemptId.trim() || assessEvidence(reference, audioId, evidence) !== 'accepted' ||
      progress.entries.some(e => e.attemptId === attemptId)) return progress;
  const entry: MasteryEntry = {
    attemptId, phrase: phraseKey(reference.text), locale: reference.locale,
    day: localDay(at, timeZone),
  };
  return { version: 2, entries: [...progress.entries, entry] };
}
export function progressCounts(progress: Progress, locale: Locale, at: Date, timeZone: string) {
  const entries = progress.entries.filter(e => e.locale === locale);
  const day = localDay(at, timeZone);
  return {
    mastered: new Set(entries.map(e => e.phrase)).size,
    today: new Set(entries.filter(e => e.day === day).map(e => e.phrase)).size,
  };
}
