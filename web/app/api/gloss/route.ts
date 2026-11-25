import { z } from "zod";
import { locales } from "../../../lib/domain";
import { meanings } from "../../../lib/services";
import { anySignal } from "../../../lib/signal";
import {
  guard,
  errorResponse,
  readLimited,
  voiceSigned,
} from "../../../lib/security";
export const runtime = "nodejs";
export const maxDuration = 30;
// What each word of a phrase means in the learner's own language. Only for
// phrases the server itself produced (proved by their signature).
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
        native: z.enum(locales),
        proof: z.string().min(20).max(100),
      })
      .safeParse(json);
    if (!input.success)
      return Response.json({ code: "invalid-input" }, { status: 400 });
    const { text, locale, native, proof } = input.data;
    if (!voiceSigned(text, locale, proof))
      return Response.json(
        { code: "forbidden" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      {
        words: await meanings(
          text,
          native,
          locale,
          anySignal(15000, request.signal),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
