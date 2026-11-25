// Live listening: the microphone is streamed to the recognizer while the
// learner speaks, so Pío can show what it hears and knows sooner that the
// turn is over. It is an extra: the recording itself is still what gets
// graded, and if anything here fails the session carries on without it.
export class Ear {
  private socket: WebSocket | null = null;
  private waiting: string[] = [];
  private closed = false;
  private pending: number[] = [];
  private position = 0;
  private said = "";
  private onText: (text: string, over: boolean) => void;
  // What is heard so far, and whether the recognizer takes the sentence as
  // finished. More speech after that reopens it.
  constructor(onText: (text: string, over: boolean) => void) {
    this.onText = onText;
  }
  // Still connected: only then is its view of the sentence worth waiting on.
  get alive() {
    return this.socket?.readyState === 1;
  }
  async open(permit: Promise<string | null>, language?: string) {
    try {
      const token = await permit;
      if (!token || this.closed || typeof WebSocket === "undefined") return;
      const socket = new WebSocket(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime?" +
          new URLSearchParams({
            model_id: "scribe_v3_live",
            audio_format: "pcm_16000",
            commit_strategy: "turn_prediction",
            token,
            ...(language ? { language_code: language } : {}),
          }),
      );
      this.socket = socket;
      socket.onopen = () => {
        for (const message of this.waiting) socket.send(message);
        this.waiting = [];
      };
      socket.onmessage = (event) => {
        if (this.closed) return;
        try {
          const message = JSON.parse(String(event.data)) as {
            message_type?: string;
            text?: string;
          };
          const text = (message.text || "").trim();
          if (message.message_type === "partial_transcript" && text)
            this.onText(`${this.said} ${text}`.trim(), false);
          else if (message.message_type === "committed_transcript" && text) {
            this.said = `${this.said} ${text}`.trim();
            this.onText(this.said, true);
          }
        } catch {}
      };
      socket.onerror = () => this.close();
    } catch {}
  }
  // Microphone samples at the context's own rate, sent on as 16 kHz PCM in
  // pieces of a tenth of a second.
  send(samples: Float32Array, rate: number) {
    if (this.closed) return;
    const step = rate / 16000;
    for (; this.position < samples.length; this.position += step) {
      const from = Math.floor(this.position),
        to = Math.min(
          samples.length,
          Math.max(from + 1, Math.floor(this.position + step)),
        );
      let sum = 0;
      for (let i = from; i < to; i++) sum += samples[i];
      const value = Math.max(-1, Math.min(1, sum / (to - from)));
      this.pending.push(Math.round(value * 32767));
    }
    this.position -= samples.length;
    if (this.pending.length < 1600) return;
    const pcm = new Int16Array(this.pending);
    this.pending = [];
    const bytes = new Uint8Array(pcm.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    const message = JSON.stringify({
      message_type: "input_audio_chunk",
      audio_base_64: btoa(binary),
      commit: false,
      sample_rate: 16000,
    });
    if (this.socket?.readyState === 1) this.socket.send(message);
    // Kept while the connection opens, but never more than a few seconds.
    else if (this.waiting.length < 50) this.waiting.push(message);
  }
  close() {
    this.closed = true;
    this.waiting = [];
    try {
      this.socket?.close();
    } catch {}
    this.socket = null;
  }
}
