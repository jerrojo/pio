import { parseTurn } from "../../../lib/schemas";
import { anySignal } from "../../../lib/signal";
import { runTurn } from "../../../lib/turn";
import { readyFor, services, synthesize } from "../../../lib/services";
import {
  guard,
  errorResponse,
  readLimited,
  signVoice,
} from "../../../lib/security";
import { maxAudioBytes, validateWav } from "../../../lib/wav";
import { overlap } from "../../../lib/words";
export const runtime = "nodejs";
export const maxDuration = 60;
// The page calls this once to wake the function before the first phrase.
export function HEAD() {
  return new Response(null, { status: 204 });
}
export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return Response.json({ code: "invalid-input" }, { status: 400 });
  if (Number(request.headers.get("content-length")) > maxAudioBytes + 12000)
    return new Response(null, { status: 413 });
  try {
    const bytes = await readLimited(request, maxAudioBytes + 12000);
    const form = await new Response(bytes as BodyInit, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    })
      .formData()
      .catch(() => {
        throw new Error("invalid-input");
      });
    const file = form.get("audio"),
      meta = form.get("turn");
    if (
      !(file instanceof File) ||
      file.size > maxAudioBytes ||
      typeof meta !== "string" ||
      meta.length > 10000
    )
      return Response.json({ code: "invalid-input" }, { status: 400 });
    let json: unknown;
    try {
      json = JSON.parse(meta);
    } catch {
      throw new Error("invalid-input");
    }
    const turn = parseTurn(json);
    if (!turn) return Response.json({ code: "invalid-input" }, { status: 400 });
    const parsed = { data: turn };
    if (!readyFor(parsed.data.preferences.target))
      throw new Error("not-configured");
    const audio = Buffer.from(await file.arrayBuffer());
    validateWav(audio);
    const signal = anySignal(45000, request.signal);
    // Per-step durations go to the server log so slow turns can be diagnosed.
    const times: string[] = [];
    const timed =
      <A extends unknown[], R>(name: string, run: (...args: A) => Promise<R>) =>
      async (...args: A) => {
        const from = Date.now();
        try {
          return await run(...args);
        } finally {
          times.push(`${name}=${Date.now() - from}`);
        }
      };
    const target = parsed.data.preferences.target;
    const heard = await runTurn(
      audio,
      parsed.data,
      {
        transcribe: timed("stt", services.transcribe),
        assess: timed("assess", services.assess),
        generate: timed("llm", services.generate),
        ...(services.coach ? { coach: timed("coach", services.coach) } : {}),
      },
      signal,
    );
    const result = heard.text
      ? { ...heard, voice: signVoice(heard.text, target) }
      : heard;
    console.log(
      "pio-timing",
      result.outcome,
      times.join(" "),
      `audio=${((audio.length - 44) / 32000).toFixed(1)}s`,
      /iPhone|iPad|iPod/.test(request.headers.get("user-agent") || "")
        ? "ios"
        : /Android/.test(request.headers.get("user-agent") || "")
          ? "android"
          : "desktop",
      JSON.stringify(heard.heard ?? ""),
      // How the recording began, as the page measured it.
      (request.headers.get("x-pio-mic") || "")
        .replace(/[^\w.;=-]/g, "")
        .slice(0, 40),
    );
    // How each word of the phrase came through, as numbers only (x = missing),
    // so the grading can be tuned on real attempts without keeping any speech.
    if (parsed.data.reference && result.evidence)
      console.log(
        "pio-words",
        result.outcome,
        result.evidence.words
          .map((w) => (w.error === "None" ? w.accuracy : "x"))
          .join(" "),
        "drill",
        result.weak?.length ?? 0,
      );
    // An accented attempt is often written down as words of some other
    // language, nothing like the phrase. Shown as "you said", that would put
    // words in the learner's mouth, so it is only shown when at least some of
    // the phrase is in it. The log above keeps what was heard, for tuning.
    if (
      parsed.data.reference &&
      (result.outcome === "accepted" || result.outcome === "practice") &&
      overlap(result.heard, parsed.data.reference.text, target) === 0
    )
      result.heard = "";
    // A new phrase Pío will say aloud travels with its voice: the result as
    // one JSON line, then the audio. The text shows at once and no second
    // request is needed. A phrase already on screen is cached by the browser.
    const spoken =
      form.get("voice") === "1" &&
      (result.outcome === "conversation" ||
        (result.outcome === "translation" &&
          result.text !== parsed.data.reference?.text));
    if (!spoken)
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(result) + "\n"),
        );
        try {
          // The voice is sent whole or not at all, so the browser never plays
          // or keeps a phrase that was cut off halfway.
          const voice = await synthesize(result.text, target, signal);
          controller.enqueue(new Uint8Array(await voice.arrayBuffer()));
        } catch {
          // Without audio the browser asks the voice endpoint itself.
        }
        try {
          controller.close();
        } catch {}
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-pio-turn",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
