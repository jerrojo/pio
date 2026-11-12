import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
test("capture worklet flushes final samples and stops producing audio after stop", async () => {
  const messages: { samples?: Float32Array; flushed?: boolean }[] = [];
  let Processor: any;
  class Base {
    port = {
      postMessage: (x: any) => messages.push(x),
      onmessage: null as any,
    };
  }
  runInNewContext(
    await readFile(
      new URL("../public/capture-worklet.js", import.meta.url),
      "utf8",
    ),
    {
      AudioWorkletProcessor: Base,
      Float32Array,
      registerProcessor: (_name: string, p: any) => (Processor = p),
    },
  );
  const capture = new Processor();
  for (let i = 0; i < 33; i++)
    capture.process([[new Float32Array(128).fill(0.25)]]);
  assert.equal(
    messages
      .filter((m) => m.samples)
      .reduce((n, m) => n + m.samples!.length, 0),
    4096,
  );
  capture.port.onmessage({ data: "flush" });
  assert.equal(
    messages
      .filter((m) => m.samples)
      .reduce((n, m) => n + m.samples!.length, 0),
    4224,
  );
  assert.equal(messages.at(-1)?.flushed, true);
  const count = messages.length;
  capture.process([[new Float32Array(128)]]);
  assert.equal(messages.length, count);
});
