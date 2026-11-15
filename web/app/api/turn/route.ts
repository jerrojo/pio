import { turnSchema } from "../../../lib/domain";
import { runTurn } from "../../../lib/turn";
import { readyFor, services, synthesize } from "../../../lib/services";
import { guard, errorResponse, readLimited } from "../../../lib/security";
import { maxAudioBytes, validateWav } from "../../../lib/wav";
export const runtime = "nodejs";
export const maxDuration = 90;
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
    }).formData();
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
    const parsed = turnSchema.safeParse(json);
    if (!parsed.success)
      return Response.json({ code: "invalid-input" }, { status: 400 });
    if (!readyFor(parsed.data.preferences.target))
      throw new Error("not-configured");
    const audio = Buffer.from(await file.arrayBuffer());
    validateWav(audio);
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(70000),
    ]);
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
    const result = await runTurn(
      audio,
      parsed.data,
      {
        transcribe: timed("stt", services.transcribe),
        assess: timed("assess", services.assess),
        generate: timed("llm", services.generate),
      },
      signal,
    );
    console.log("pio-timing", result.outcome, times.join(" "));
    // A reply Pío will say aloud travels with its voice: the result as one
    // JSON line, then the audio. The text shows at once and no second request
    // is needed. A repeated practice phrase is already cached by the browser.
    const spoken =
      form.get("voice") === "1" &&
      (["translation", "conversation"].includes(result.outcome) ||
        (result.outcome === "practice" && !parsed.data.reference));
    if (!spoken)
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    const target = parsed.data.preferences.target;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(result) + "\n"),
        );
        try {
          const voice = await synthesize(result.text, target, signal);
          const reader = voice.body!.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch {
          // Without audio the browser asks the voice endpoint itself.
        }
        controller.close();
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
