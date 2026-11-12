import { encodeWav } from "./wav";
export class Recorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private closed = false;
  private flushed: (() => void) | null = null;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (this.closed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      await this.context.audioWorklet.addModule("/capture-worklet.js");
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
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source?.disconnect();
    this.node?.disconnect();
    this.gain?.disconnect();
    this.chunks = [];
  }
}
