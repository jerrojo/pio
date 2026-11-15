// Read-only reproduction of legacy behavior; no provider/network calls or user data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const store = new Map();
const cache = new Map();
function load(relative) {
  const file = path.join(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} }; cache.set(file, module);
  const wrapper = vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    console: { error() {}, warn() {}, log() {} },
    fetch: async () => { throw new Error('Controlled offline fixture'); },
    FormData, Date, Set, Map,
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
  });
  wrapper(id => {
    if (!id.startsWith('@/')) throw new Error(`Unexpected import: ${id}`);
    return load(`${id.slice(2)}.ts`);
  }, module, module.exports);
  return module.exports;
}
(async () => {
  const phrase = 'Ich liebe dich';
  const scoring = load('lib/server/scoring.ts');
  const agent = load('lib/agent.ts');
  const pronunciation = load('lib/pronunciation.ts');
  const progress = load('lib/progress.ts');
  const selfComparison = scoring.scorePronunciation(phrase, phrase);
  const translationOffline = await agent.translateText('Te quiero', 'de', 'es');
  const evaluationOffline = await pronunciation.evaluatePronunciation(null, phrase, 'de', 'Ich liebe', 'es');
  for (let i = 0; i < 3; i++) progress.recordMastery(phrase);
  console.log(JSON.stringify({
    sourceCommit: '0b56f06e61c59c6d4690fe6b6f30e1313757137a',
    environment: 'controlled in-memory fixtures; no real audio or providers',
    selfComparison, translationOffline, evaluationOffline,
    threeIdenticalMasteries: progress.loadProgress(),
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
