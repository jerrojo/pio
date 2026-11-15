import type { Result } from "./domain.ts";
// Reads a turn reply: plain JSON, or one JSON line followed by Pío's voice.
// The result is handed over as soon as its line arrives; the audio, if any,
// is returned once the stream ends.
export async function readTurn(
  response: Response,
  onResult: (r: Result) => void,
) {
  if (
    !response.headers.get("content-type")?.startsWith("application/x-pio-turn")
  ) {
    onResult((await response.json()) as Result);
    return null;
  }
  const reader = response.body!.getReader();
  const head: Uint8Array[] = [],
    audio: Uint8Array[] = [];
  let parsed = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (parsed) {
      audio.push(value);
      continue;
    }
    const end = value.indexOf(10);
    if (end < 0) {
      head.push(value);
      continue;
    }
    head.push(value.subarray(0, end));
    onResult(JSON.parse(await new Blob(head as BlobPart[]).text()) as Result);
    parsed = true;
    if (end + 1 < value.length) audio.push(value.subarray(end + 1));
  }
  return audio.length
    ? new Blob(audio as BlobPart[], { type: "audio/mpeg" })
    : null;
}
