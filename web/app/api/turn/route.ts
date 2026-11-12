import { turnSchema } from "../../../lib/domain";
import { runTurn } from "../../../lib/turn";
import { readyFor, services } from "../../../lib/services";
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
    const result = await runTurn(audio, parsed.data, services, signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
