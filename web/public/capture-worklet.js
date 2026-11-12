class PioCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(4096);
    this.used = 0;
    this.stopped = false;
    this.port.onmessage = (e) => {
      if (e.data === "flush") {
        this.flush();
        this.port.postMessage({ flushed: true });
        this.stopped = true;
      }
    };
  }
  flush() {
    if (this.used) {
      const samples = this.buffer.slice(0, this.used);
      this.port.postMessage({ samples }, [samples.buffer]);
      this.used = 0;
    }
  }
  process(inputs) {
    const data = inputs[0]?.[0];
    if (data && !this.stopped) {
      for (const sample of data) {
        this.buffer[this.used++] = sample;
        if (this.used === this.buffer.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor("pio-capture", PioCapture);
