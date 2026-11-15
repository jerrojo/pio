import test from "node:test";
import assert from "node:assert/strict";
import { readTurn } from "../lib/turn-reply.ts";
import type { Result } from "../lib/domain.ts";

const result = {
  id: "a",
  outcome: "translation",
  heard: "Hola",
  text: "Hallo – schön!",
  reference: null,
  evidence: null,
  focus: [],
} as unknown as Result;
const line = new TextEncoder().encode(JSON.stringify(result) + "\n");
const audio = new Uint8Array([10, 1, 2, 10, 255, 0, 7]);
function reply(chunks: Uint8Array[]) {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { headers: { "Content-Type": "application/x-pio-turn" } },
  );
}
const whole = new Uint8Array([...line, ...audio]);

test("a plain JSON reply has a result and no voice", async () => {
  let got: Result | null = null;
  const voice = await readTurn(Response.json(result), (r) => (got = r));
  assert.deepEqual(got, result);
  assert.equal(voice, null);
});
test("a combined reply yields the result first and then the exact audio bytes", async () => {
  // Every possible split point, including inside the JSON line and the audio.
  for (let cut = 1; cut < whole.length; cut++) {
    let got: Result | null = null;
    const voice = await readTurn(
      reply([whole.subarray(0, cut), whole.subarray(cut)]),
      (r) => (got = r),
    );
    assert.deepEqual(got, result);
    assert.deepEqual(new Uint8Array(await voice!.arrayBuffer()), audio);
    assert.equal(voice!.type, "audio/mpeg");
  }
});
test("a combined reply whose voice failed has a result and no audio", async () => {
  let got: Result | null = null;
  const voice = await readTurn(reply([line]), (r) => (got = r));
  assert.deepEqual(got, result);
  assert.equal(voice, null);
});
