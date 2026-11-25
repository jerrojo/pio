import { encodeWav } from "./wav";
// The capture module is loaded once per audio context, before the microphone
// opens, so no speech is lost while it downloads.
const modules = new WeakMap<AudioContext, Promise<void>>();
export function prepareCapture(context: AudioContext) {
  let ready = modules.get(context);
  if (!ready) {
    ready = context.audioWorklet.addModule("/capture-worklet.js");
    modules.set(context, ready);
    ready.catch(() => modules.delete(context));
  }
  return ready;
}
// Asking for the microphone takes a moment every time. During a session it
// stays open between turns so Pío listens the instant its voice ends. That
// includes iPhone and iPad, where opening takes about a second: closing it
// between turns lost the learner's first word, and opening it while Pío was
// still speaking made the voice stutter.
let mic: MediaStream | null = null,
  idle: ReturnType<typeof setTimeout> | null = null;
const keeps = () => true;
const apple = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const wanted = {
  audio: {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};
// Opening the microphone takes long enough to lose the first word of someone
// who answers at once. So it is asked for while Pío is still finishing its
// phrase, and is already open when the learner starts.
let warming: Promise<void> | null = null;
export function warmMic() {
  // Not on iPhone and iPad: opening it there interrupts the voice playing.
  if (
    apple() ||
    warming ||
    mic?.getAudioTracks()[0]?.readyState === "live" ||
    !navigator.mediaDevices?.getUserMedia
  )
    return;
  warming = navigator.mediaDevices
    .getUserMedia(wanted)
    .then((stream) => {
      releaseMic();
      mic = stream;
      // Never left open if no turn comes to use it.
      idle = setTimeout(releaseMic, keeps() ? 30000 : 4000);
    })
    .catch(() => {})
    .finally(() => {
      warming = null;
    });
}
export function releaseMic() {
  if (idle) clearTimeout(idle);
  idle = null;
  mic?.getTracks().forEach((t) => t.stop());
  mic = null;
}
export class Recorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private closed = false;
  private flushed: (() => void) | null = null;
  onLost: (() => void) | null = null;
  // Every piece of microphone audio as it arrives, for live listening.
  onSamples: ((samples: Float32Array, rate: number) => void) | null = null;
  get started() {
    return !!this.node && !this.closed;
  }
  constructor(context: AudioContext) {
    this.context = context;
  }
  async start(onLevel: (level: number, seconds: number) => void) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw new Error("unsupported-microphone");
    if (!this.context) throw new Error("unsupported-microphone");
    await this.context.resume();
    if (this.closed) return;
    if (!this.context.audioWorklet) {
      this.cancel();
      throw new Error("unsupported-microphone");
    }
    try {
      const module = prepareCapture(this.context);
      if (warming) await warming;
      if (idle) clearTimeout(idle);
      idle = null;
      const open = mic?.getAudioTracks()[0]?.readyState === "live";
      const stream = open
        ? mic!
        : await navigator.mediaDevices.getUserMedia(wanted);
      if (!open) {
        releaseMic();
        if (keeps()) mic = stream;
      }
      if (this.closed) {
        this.stream = stream;
        this.cancel();
        return;
      }
      this.stream = stream;
      // The page learns at once if the microphone is taken away mid-turn.
      stream
        .getAudioTracks()[0]
        ?.addEventListener("ended", () => this.onLost?.());
      await module;
      if (this.closed) return;
      this.node = new AudioWorkletNode(this.context, "pio-capture");
      let count = 0;
      this.node.port.onmessage = (event) => {
        if (event.data.flushed) {
          this.flushed?.();
          return;
        }
        const samples = event.data.samples as Float32Array;
        if (this.closed || !samples) return;
        this.chunks.push(samples);
        this.onSamples?.(samples, this.context!.sampleRate);
        count += samples.length;
        const rms = Math.sqrt(
          samples.reduce((n, x) => n + x * x, 0) / samples.length,
        );
        onLevel(rms, count / this.context!.sampleRate);
      };
      this.source = this.context.createMediaStreamSource(stream);
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      this.source.connect(this.node);
      this.node.connect(this.gain);
      this.gain.connect(this.context.destination);
    } catch (error) {
      this.cancel();
      throw error;
    }
  }
  async finish() {
    if (this.closed || !this.context || !this.node)
      throw new Error("cancelled");
    const rate = this.context.sampleRate;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("capture-failed")),
          1500,
        );
        this.flushed = () => {
          clearTimeout(timer);
          resolve();
        };
        this.node!.port.postMessage("flush");
      });
      if (this.closed) throw new Error("cancelled");
      if (rate === 16000)
        return new Blob([encodeWav(this.chunks, rate)], { type: "audio/wav" });
      // Use the browser's audio resampler before PCM encoding, preserving speech detail.
      const length = this.chunks.reduce((n, c) => n + c.length, 0);
      const renderer = new OfflineAudioContext(
        1,
        Math.ceil((length * 16000) / rate),
        16000,
      );
      const buffer = renderer.createBuffer(1, length, rate);
      let offset = 0;
      for (const chunk of this.chunks) {
        buffer.copyToChannel(new Float32Array(chunk), 0, offset);
        offset += chunk.length;
      }
      const source = renderer.createBufferSource();
      source.buffer = buffer;
      source.connect(renderer.destination);
      source.start();
      const rendered = await renderer.startRendering();
      if (this.closed) throw new Error("cancelled");
      return new Blob([encodeWav([rendered.getChannelData(0)], 16000)], {
        type: "audio/wav",
      });
    } finally {
      this.cancel();
    }
  }
  cancel() {
    this.closed = true;
    this.onLost = null;
    this.onSamples = null;
    try {
      this.node?.port.postMessage("stop");
    } catch {}
    if (this.stream && this.stream === mic && keeps()) {
      // Kept for the next turn, but never left open if none comes.
      if (idle) clearTimeout(idle);
      idle = setTimeout(releaseMic, 30000);
    } else if (this.stream && this.stream === mic) releaseMic();
    else this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.source?.disconnect();
    this.node?.disconnect();
    this.gain?.disconnect();
    this.chunks = [];
  }
}
