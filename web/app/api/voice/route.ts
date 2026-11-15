import { z } from "zod";
import { locales } from "../../../lib/domain";
import { synthesize } from "../../../lib/services";
import { anySignal } from "../../../lib/signal";
import { canon } from "../../../lib/words";
import {
  guard,
  errorResponse,
  readLimited,
  voiceSigned,
} from "../../../lib/security";
export const runtime = "nodejs";
export const maxDuration = 30;
// Speaks a phrase the server itself produced (proved by its signature), or
// one word of it. It never reads out text invented by the caller.
export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 4000)
    return new Response(null, { status: 413 });
  try {
    const bytes = await readLimited(request, 4000);
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error("invalid-input");
    }
    const input = z
      .object({
        text: z.string().trim().min(1).max(500),
        locale: z.enum(locales),
        proof: z.string().min(20).max(100),
        word: z.string().trim().min(1).max(80).optional(),
      })
      .safeParse(json);
    if (!input.success)
      return Response.json({ code: "invalid-input" }, { status: 400 });
    const { text, locale, proof, word } = input.data;
    if (
      !voiceSigned(text, locale, proof) ||
      (word && !canon(text).includes(canon(word)))
    )
      return Response.json(
        { code: "forbidden" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    const response = await synthesize(
      word || text,
      locale,
      anySignal(25000, request.signal),
    );
    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
