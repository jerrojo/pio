// One shared way of comparing words, used both to decide whether the learner
// repeated the phrase and to grade the repetition. It is deliberately
// forgiving about spelling: the recognizer chooses the spelling, the learner
// only made the sound.
const numbers: Record<string, string[]> = Object.fromEntries(
  Object.entries({
    es: "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce",
    en: "zero one two three four five six seven eight nine ten eleven twelve",
    de: "null eins zwei drei vier funf sechs sieben acht neun zehn elf zwolf",
    fr: "zero un deux trois quatre cinq six sept huit neuf dix onze douze",
    it: "zero uno due tre quattro cinque sei sette otto nove dieci undici dodici",
    pt: "zero um dois tres quatro cinco seis sete oito nove dez onze doze",
  }).map(([language, words]) => [language, words.split(" ")]),
);

// Hesitation sounds the recognizer writes down verbatim.
const fillers = new Set(
  "ah eh em hm hmm mm mmm mhm oh uh um uhm er erm ahm ah ehm euh este pues".split(
    " ",
  ),
);
export const isFiller = (key: string) => fillers.has(key);

export function canon(text: string, language = "") {
  const plain = text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  const digit = numbers[language.split("-")[0]]?.indexOf(plain) ?? -1;
  return digit >= 0 ? String(digit) : plain;
}
// Words of a sentence: split on spaces and on the dashes and slashes that join
// compounds, so "E-Mail" and "und/oder" are compared word by word.
export const pieces = (text: string) =>
  text.split(/[\s‐-―/-]+/u).filter(Boolean);
export const keysOf = (text: string, language = "") =>
  pieces(text)
    .map((word) => canon(word, language))
    .filter(Boolean);

function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    previous = row;
  }
  return previous[b.length];
}
// The same word, or a spelling the recognizer could have chosen for the same
// sound ("mangé"/"manger", "dass"/"das" are one letter apart).
export const sameWord = (a: string, b: string) =>
  a === b ||
  (Math.min(a.length, b.length) >= 3 &&
    !/\d/.test(a + b) &&
    distance(a, b) <= 1);

// Share of the reference's words that the learner also said.
export function overlap(heard: string, reference: string, language = "") {
  const said = keysOf(heard, language),
    expected = keysOf(reference, language);
  if (!expected.length) return 0;
  const left = [...said];
  let found = 0;
  for (const word of expected) {
    const at = left.findIndex((other) => sameWord(word, other));
    if (at >= 0) {
      left.splice(at, 1);
      found++;
    }
  }
  return found / expected.length;
}

// What the text model returned, reduced to the sentence Pío will show and say.
export function cleanReply(reply: string) {
  let text = reply
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const pairs: [string, string][] = [
    ['"', '"'],
    ["“", "”"],
    ["„", "“"],
    ["„", "”"],
    ["«", "»"],
    ["»", "«"],
    ["‘", "’"],
    ["‚", "‘"],
  ];
  for (const [open, close] of pairs)
    if (
      text.length > 1 &&
      text.startsWith(open) &&
      text.endsWith(close) &&
      !text.slice(1, -1).includes(open) &&
      !text.slice(1, -1).includes(close)
    )
      text = text.slice(1, -1).trim();
  return text;
}
