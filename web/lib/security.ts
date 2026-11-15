import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
const sign = (v: string) =>
  createHmac("sha256", process.env.PIO_ACCESS_CODE || "local-only")
    .update(v)
    .digest("hex");
export function newSession() {
  const payload = `${Date.now() + 12 * 60 * 60 * 1000}.${randomUUID()}`;
  return `${payload}.${sign(payload)}`;
}
export function authorized(request: Request) {
  // No access code configured means Pío opens directly; setting one closes it.
  if (!process.env.PIO_ACCESS_CODE) return true;
  const value =
    request.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith("pio_session="))
      ?.slice(12) || "";
  const [expiry, id, signature, ...extra] = value.split(".");
  return (
    !extra.length &&
    !!id &&
    !!signature &&
    Number(expiry) > Date.now() &&
    equalSecret(signature, sign(`${expiry}.${id}`))
  );
}
// Proof that the server itself produced a text. The voice endpoint only
// speaks signed texts, so it cannot be used to read out arbitrary input.
const voiceKey = () =>
  createHash("sha256")
    .update(
      `pio-voice:${process.env.PIO_SESSION_SECRET || process.env.ELEVENLABS_API_KEY || "local-only"}`,
    )
    .digest();
export const signVoice = (text: string, locale: string) =>
  createHmac("sha256", voiceKey())
    .update(`${locale}\n${text}`)
    .digest("base64url");
export const voiceSigned = (text: string, locale: string, proof: string) =>
  equalSecret(signVoice(text, locale), proof);
// In-memory limiter: per instance, so it slows abuse down rather than
// stopping it. A shared store is required before public signup.
const windows = new Map<string, { at: number; count: number }>();
export function allow(key: string, limit = 30) {
  const now = Date.now();
  for (const [k, v] of windows) if (now - v.at >= 60000) windows.delete(k);
  const current = windows.get(key) || { at: now, count: 0 };
  current.count++;
  windows.set(key, current);
  return current.count <= limit;
}
const refuse = (code: string, status: number, extra: HeadersInit = {}) =>
  Response.json(
    { code },
    { status, headers: { "Cache-Control": "no-store", ...extra } },
  );
export function guard(request: Request) {
  // Browsers always send Origin on these requests; anything without a
  // matching one is not Pío's own page.
  if (!sameOrigin(request)) return refuse("forbidden", 403);
  if (!authorized(request)) return refuse("access-required", 401);
  const caller =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(`caller:${caller}`, 45) || !allow("everyone", 150))
    return refuse("too-many-requests", 429, { "Retry-After": "60" });
  return null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const endpoint = new URL(request.url);
    // Internal URLs may use localhost while the browser requests 127.0.0.1.
    // Host is the browser's destination. Do not trust forwarded-host.
    const host = request.headers.get("host") || endpoint.host;
    return source.host === host && source.protocol === endpoint.protocol;
  } catch {
    return false;
  }
}
export function errorResponse(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  // A provider that took too long, or a learner who moved on.
  const code =
    name === "TimeoutError"
      ? "provider-timeout"
      : name === "AbortError"
        ? "cancelled"
        : error instanceof Error
          ? error.message
          : "";
  const known = [
    "not-configured",
    "provider-busy",
    "provider-quota",
    "provider-unavailable",
    "provider-timeout",
    "assessment-incomplete",
    "assessment-unavailable",
    "invalid-audio",
    "invalid-input",
    "input-too-large",
    "invalid-translation",
    "phrase-too-long",
    "cancelled",
  ];
  // Unknown failures are logged server-side (never sent to the browser) so a
  // provider or parsing problem can be diagnosed. Key-like strings are masked.
  if (!known.includes(code) && error instanceof Error)
    console.error(
      "pio-error",
      error.name,
      error.message.replace(/\b(sk|xi)[-_][\w-]+/g, "[redacted]").slice(0, 300),
    );
  return Response.json(
    { code: known.includes(code) ? code : "service-unavailable" },
    {
      status:
        code === "input-too-large"
          ? 413
          : ["invalid-audio", "invalid-input", "phrase-too-long"].includes(code)
            ? 400
            : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function readLimited(
  request: Request,
  limit: number,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("input-too-large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid-input");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("input-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
