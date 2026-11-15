import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessEvidence, classifyTurn, initialSession, transition, emptyProgress, recordMastery, progressCounts, localDay } from '../core.ts';
import { requestJson, parseTranslation } from '../transport.ts';

const reference = { id: 'ref-1', text: 'Good morning', locale: 'en-US' };
const evidence = { source: 'acoustic', referenceId: 'ref-1', audioId: 'audio-1', locale: 'en-US',
  speechDetected: true, accuracy: 90, completeness: 100,
  words: [{ text: 'Good', accuracy: 90, omitted: false }, { text: 'morning', accuracy: 90, omitted: false }] };
const route = overrides => classifyTurn({ text: 'Good morning', detectedLanguage: 'en', confidence: 'high',
  nativeLocale: 'es-MX', targetLocale: 'en-US', reference, ...overrides });
const capture = () => {
  let s = transition(initialSession(), { type: 'start' });
  s = transition(s, { type: 'record' });
  return transition(s, { type: 'captured', token: s.token, audioId: 'audio-1' });
};
const speaking = () => {
  let s = capture();
  s = transition(s, { type: 'classified', token: s.token, intent: 'translate' });
  return transition(s, { type: 'translated', token: s.token, reference });
};
const evaluating = () => {
  let s = speaking();
  s = transition(s, { type: 'playback-ended', token: s.token });
  s = transition(s, { type: 'record' });
  s = transition(s, { type: 'captured', token: s.token, audioId: 'audio-1' });
  return transition(s, { type: 'classified', token: s.token, intent: 'evaluate' });
};

test('native speech translates even with a pending exercise', () => assert.equal(route({ detectedLanguage: 'es' }), 'translate'));
test('target speech uses the existing reference', () => assert.equal(route({}), 'evaluate'));
test('target speech without reference cannot grade itself', () => assert.equal(route({ reference: null }), 'reference-needed'));
test('a third language is not automatically a failed attempt', () => assert.equal(route({ detectedLanguage: 'de' }), 'clarify'));
test('an uncertain accented utterance requests clarification', () => assert.equal(route({ confidence: 'uncertain' }), 'clarify'));
test('silence does not enter an assessment', () => assert.equal(route({ text: '  ' }), 'no-speech'));
test('explicit translation overrides the recognizer', () => assert.equal(route({ explicitIntent: 'translate' }), 'translate'));
test('explicit evaluation still requires a reference', () => assert.equal(route({ reference: null, explicitIntent: 'evaluate' }), 'reference-needed'));
test('regional variants of the same language are not mistaken for two languages', () => assert.equal(route({ nativeLocale: 'en-GB' }), 'clarify'));
test('a reference from another language cannot be used', () => assert.equal(route({ reference: { ...reference, locale: 'de-DE' } }), 'reference-needed'));

test('the confirmed Spanish to German journey routes Spanish into translation', () => {
  assert.equal(route({ text: 'Te quiero', detectedLanguage: 'es', targetLocale: 'de-DE', reference: null }), 'translate');
});
test('German repetition uses the German reference', () => {
  assert.equal(route({ text: 'Ich liebe dich', detectedLanguage: 'de', targetLocale: 'de-DE', reference: { id: 'de-1', text: 'Ich liebe dich', locale: 'de-DE' } }), 'evaluate');
});
test('a short German word is not discarded by a word-count gate', () => {
  assert.equal(route({ text: 'dich', detectedLanguage: 'de', targetLocale: 'de-DE', reference: { id: 'de-word-1', text: 'dich', locale: 'de-DE' } }), 'evaluate');
});
test('a German attempt labelled English by the recognizer requires clarification', () => {
  assert.equal(route({ text: 'ich', detectedLanguage: 'en', targetLocale: 'de-DE', reference: { id: 'de-word-2', text: 'ich', locale: 'de-DE' } }), 'clarify');
});
test('acoustic evidence for another regional language cannot certify a German phrase', () => {
  assert.equal(assessEvidence({ id: 'ref-1', text: 'Ich liebe dich', locale: 'de-DE' }, 'audio-1', evidence), 'unavailable');
});

test('real acoustic evidence may pass the candidate policy', () => assert.equal(assessEvidence(reference, 'audio-1', evidence), 'accepted'));
for (const [name, patch] of [
  ['text similarity', { source: 'transcript' }], ['silence', { speechDetected: false }],
  ['wrong recording', { audioId: 'other' }], ['wrong phrase', { referenceId: 'other' }],
  ['wrong language', { locale: 'de-DE' }], ['NaN', { accuracy: NaN }],
  ['out-of-range score', { accuracy: 101 }], ['missing word evidence', { words: [] }],
]) test(`${name} never becomes a passing pronunciation grade`, () => assert.equal(assessEvidence(reference, 'audio-1', { ...evidence, ...patch }), 'unavailable'));
test('omitting a word prevents mastery even when total accuracy is high', () => {
  assert.equal(assessEvidence(reference, 'audio-1', { ...evidence, words: [{ ...evidence.words[0], omitted: true }] }), 'practice');
});
test('weak words prevent mastery', () => assert.equal(assessEvidence(reference, 'audio-1', { ...evidence, words: [{ text: 'Good', accuracy: 40, omitted: false }] }), 'practice'));
test('low completeness prevents mastery', () => assert.equal(assessEvidence(reference, 'audio-1', { ...evidence, completeness: 50 }), 'practice'));
test('invalid thresholds fail closed', () => assert.equal(assessEvidence(reference, 'audio-1', evidence, { accuracy: -1, completeness: 0, wordAccuracy: 0 }), 'unavailable'));

test('recording is blocked while Pío speaks', () => { const s = speaking(); assert.equal(transition(s, { type: 'record' }), s); });
test('new recordings are blocked while processing another turn', () => { const s = capture(); assert.equal(transition(s, { type: 'record' }), s); });
test('a completed playback opens listening without discarding a quick human repetition', () => {
  const s = speaking(); const listening = transition(s, { type: 'playback-ended', token: s.token });
  assert.equal(transition(listening, { type: 'record' }).phase, 'recording');
});
test('late responses after reset cannot overwrite a new session', () => {
  const old = capture(); const reset = transition(old, { type: 'reset' });
  assert.equal(transition(reset, { type: 'classified', token: old.token, intent: 'translate' }), reset);
});
test('pause preserves phrase but invalidates pending audio', () => {
  const s = evaluating(); const paused = transition(s, { type: 'pause' });
  assert.deepEqual(paused.reference, reference);
  assert.equal(transition(paused, { type: 'assessed', token: s.token, evidence }), paused);
});
test('retry requires a new attempt; an old response cannot complete it', () => {
  const s = evaluating(); const failed = transition(s, { type: 'failed', token: s.token, code: 'timeout' });
  const restarted = transition(transition(failed, { type: 'retry' }), { type: 'record' });
  assert.notEqual(restarted.token, s.token);
  assert.equal(transition(restarted, { type: 'assessed', token: s.token, evidence }), restarted);
});
test('duplicate provider responses have no second effect', () => {
  const s = evaluating(); const event = { type: 'assessed', token: s.token, evidence };
  const done = transition(s, event); assert.equal(done.decision, 'accepted');
  assert.equal(transition(done, event), done);
});
test('a server claiming evaluate cannot cause reference-free scoring', () => {
  const s = capture(); const next = transition(s, { type: 'classified', token: s.token, intent: 'evaluate' });
  assert.equal(next.phase, 'feedback'); assert.equal(next.issue, 'reference-needed');
});
test('empty translations are errors, never the original phrase', () => {
  const s = transition(capture(), { type: 'classified', token: '0:1', intent: 'translate' });
  assert.equal(transition(s, { type: 'translated', token: s.token, reference: { ...reference, text: '' } }).phase, 'error');
});
test('wrong-turn responses leave current state untouched', () => {
  const s = evaluating(); assert.equal(transition(s, { type: 'assessed', token: 'old', evidence }), s);
});

const masteryInput = (progress, patch = {}) => ({ progress, reference, evidence, audioId: 'audio-1',
  attemptId: 'uuid-1', at: new Date('2026-10-31T02:00:00Z'), timeZone: 'America/Mexico_City', ...patch });
test('Mexico daily progress does not reset at UTC midnight', () => assert.equal(localDay(new Date('2026-10-31T02:00:00Z'), 'America/Mexico_City'), '2026-10-30'));
test('retrying the same saved attempt is idempotent', () => {
  const p = recordMastery(masteryInput(emptyProgress())); assert.equal(recordMastery(masteryInput(p)), p);
});
test('repeating one phrase does not fabricate three daily phrases', () => {
  let p = emptyProgress();
  for (let i = 0; i < 3; i++) p = recordMastery(masteryInput(p, { attemptId: `uuid-${i}` }));
  assert.deepEqual(progressCounts(p, 'en-US', new Date('2026-10-31T02:00:00Z'), 'America/Mexico_City'), { mastered: 1, today: 1 });
});
test('progress is isolated by learning locale', () => {
  const p = recordMastery(masteryInput(emptyProgress()));
  assert.deepEqual(progressCounts(p, 'de-DE', new Date(), 'America/Mexico_City'), { mastered: 0, today: 0 });
});
test('the same phrase on another day counts as practice, not a new lifetime mastery', () => {
  const p = recordMastery(masteryInput(recordMastery(masteryInput(emptyProgress())), { attemptId: 'uuid-2', at: new Date('2026-11-01T02:00:00Z') }));
  assert.deepEqual(progressCounts(p, 'en-US', new Date('2026-11-01T02:00:00Z'), 'America/Mexico_City'), { mastered: 1, today: 1 });
});
test('a text-only assessment cannot update progress', () => {
  const p = emptyProgress(); assert.equal(recordMastery(masteryInput(p, { evidence: { ...evidence, source: 'transcript' } })), p);
});

test('a valid translation response is parsed', async () => {
  const result = await requestJson('/translation', {}, { parse: parseTranslation, fetcher: async () => Response.json({ translatedText: ' Good morning ' }) });
  assert.deepEqual(result, { ok: true, value: 'Good morning' });
});
test('a 503 is an error even if its body resembles successful content', async () => {
  assert.deepEqual(await requestJson('/translation', {}, { parse: parseTranslation, fetcher: async () => Response.json({ translatedText: 'fake' }, { status: 503 }) }), { ok: false, error: 'http', status: 503 });
});
test('network failure never returns source text or a default score', async () => {
  assert.deepEqual(await requestJson('/translation', {}, { parse: parseTranslation, fetcher: async () => { throw Error('offline'); } }), { ok: false, error: 'network' });
});
test('a successful HTTP status with malformed content is still a failure', async () => {
  assert.deepEqual(await requestJson('/translation', {}, { parse: parseTranslation, fetcher: async () => Response.json({}) }), { ok: false, error: 'invalid-response' });
});
test('non-JSON provider errors cannot become results', async () => {
  assert.deepEqual(await requestJson('/translation', {}, { parse: parseTranslation, fetcher: async () => new Response('<html>error</html>') }), { ok: false, error: 'invalid-response' });
});
test('a stalled request terminates and aborts its underlying fetch', async () => {
  let signal;
  const result = await requestJson('/translation', {}, { timeoutMs: 10, parse: parseTranslation, fetcher: async (_, init) => { signal = init.signal; return new Promise(() => {}); } });
  assert.deepEqual(result, { ok: false, error: 'timeout' }); assert.equal(signal.aborted, true);
});
test('user cancellation settles immediately even if the provider ignores cancellation', async () => {
  const controller = new AbortController();
  const pending = requestJson('/translation', { signal: controller.signal }, { parse: parseTranslation, fetcher: async () => new Promise(() => {}) });
  controller.abort(); assert.deepEqual(await pending, { ok: false, error: 'cancelled' });
});
test('an already cancelled request is never sent', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  assert.deepEqual(await requestJson('/translation', { signal: controller.signal }, { parse: parseTranslation, fetcher: async () => { calls++; return Response.json({}); } }), { ok: false, error: 'cancelled' });
  assert.equal(calls, 0);
});
