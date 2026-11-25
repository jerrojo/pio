import { earToken } from "../../../lib/services";
import { anySignal } from "../../../lib/signal";
import { guard, errorResponse } from "../../../lib/security";
export const runtime = "nodejs";
export const maxDuration = 15;
// A permit for one short live-listening session, so the browser can stream
// the microphone straight to the recognizer and show what it hears while the
// learner speaks. The API key never leaves the server.
export async function POST(request: Request) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const token = await earToken(anySignal(6000, request.signal));
    return Response.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
