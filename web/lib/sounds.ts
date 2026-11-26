// Pío's sounds, made on the spot from a few soft tones: nothing to download,
// and each one short and quiet enough to sit under a voice. They say what
// just happened to someone who is not looking at the screen.
export type Cue =
  // The microphone is open: your turn.
  | "listen"
  // You stopped talking and Pío took it.
  | "heard"
  // A new phrase arrived.
  | "reply"
  // One word came out well.
  | "word"
  // The whole phrase came out well.
  | "win"
  // Not yet: gentle, never a buzzer.
  | "miss"
  // Something failed on Pío's side.
  | "oops"
  // Pío itself, when tapped.
  | "chirp";

type Tone = {
  // Pitch in hertz, and where it glides to, if it moves.
  from: number;
  to?: number;
  // Start and length in seconds, and loudness from 0 to 1.
  at: number;
  for: number;
  loud: number;
  shape?: OscillatorType;
};
const scores: Record<Cue, Tone[]> = {
  listen: [{ from: 520, to: 780, at: 0, for: 0.09, loud: 0.07 }],
  heard: [{ from: 700, to: 480, at: 0, for: 0.09, loud: 0.06 }],
  reply: [
    { from: 440, to: 660, at: 0, for: 0.07, loud: 0.07, shape: "triangle" },
    { from: 880, at: 0.06, for: 0.12, loud: 0.04 },
  ],
  word: [
    { from: 880, at: 0, for: 0.16, loud: 0.11 },
    { from: 1320, at: 0.07, for: 0.2, loud: 0.06 },
  ],
  // A rising chord, then two bright notes for the star landing.
  win: [
    { from: 523.25, at: 0, for: 0.22, loud: 0.11, shape: "triangle" },
    { from: 659.25, at: 0.09, for: 0.22, loud: 0.11, shape: "triangle" },
    { from: 783.99, at: 0.18, for: 0.24, loud: 0.11, shape: "triangle" },
    { from: 1046.5, at: 0.27, for: 0.42, loud: 0.12, shape: "triangle" },
    { from: 2093, at: 0.62, for: 0.18, loud: 0.05 },
    { from: 2637, at: 0.7, for: 0.3, loud: 0.05 },
  ],
  miss: [
    { from: 392, to: 330, at: 0, for: 0.2, loud: 0.07, shape: "triangle" },
  ],
  oops: [
    { from: 311, at: 0, for: 0.14, loud: 0.07, shape: "triangle" },
    { from: 247, at: 0.13, for: 0.22, loud: 0.07, shape: "triangle" },
  ],
  chirp: [
    { from: 2300, to: 3300, at: 0, for: 0.07, loud: 0.07 },
    { from: 2500, to: 3600, at: 0.1, for: 0.08, loud: 0.07 },
  ],
};
// Plays a cue on an audio clock a tap has already started. Silent, and never
// an error, anywhere sound is not available.
export function cue(context: AudioContext | null, name: Cue) {
  if (!context || context.state !== "running") return;
  try {
    for (const tone of scores[name]) {
      const start = context.currentTime + tone.at,
        end = start + tone.for;
      const voice = context.createOscillator(),
        volume = context.createGain();
      voice.type = tone.shape || "sine";
      voice.frequency.setValueAtTime(tone.from, start);
      if (tone.to) voice.frequency.exponentialRampToValueAtTime(tone.to, end);
      // A quick rise and a soft fall, so nothing clicks.
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(tone.loud, start + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0008, end);
      voice.connect(volume).connect(context.destination);
      voice.start(start);
      voice.stop(end + 0.03);
    }
  } catch {}
}
// How long each cue lasts, for whoever needs to wait for it.
export const cueLength = (name: Cue) =>
  Math.max(...scores[name].map((tone) => tone.at + tone.for));
