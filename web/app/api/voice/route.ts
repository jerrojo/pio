import { z } from "zod";
import { locales } from "../../../lib/domain";
import { synthesize } from "../../../lib/services";
import { guard, errorResponse, readLimited } from "../../../lib/security";
export const runtime = "nodejs";
export const maxDuration = 30;
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
      })
      .safeParse(json);
    if (!input.success)
      return Response.json({ code: "invalid-input" }, { status: 400 });
    const response = await synthesize(
      input.data.text,
      input.data.locale,
      request.signal,
    );
    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
