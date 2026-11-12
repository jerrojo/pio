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
  if (!process.env.PIO_ACCESS_CODE)
    return process.env.NODE_ENV === "development";
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
// A private pilot limiter. A distributed per-user limiter is required before public signup.
const windows = new Map<string, { at: number; count: number }>();
export function allow(key: string, limit = 30) {
  const now = Date.now();
  for (const [k, v] of windows) if (now - v.at >= 60000) windows.delete(k);
  const current = windows.get(key) || { at: now, count: 0 };
  current.count++;
  windows.set(key, current);
  return current.count <= limit;
}
export function guard(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !sameOrigin(request))
    return Response.json({ code: "forbidden" }, { status: 403 });
  if (!authorized(request))
    return Response.json({ code: "access-required" }, { status: 401 });
  if (!allow("private-pilot"))
    return Response.json({ code: "too-many-requests" }, { status: 429 });
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
  const code = error instanceof Error ? error.message : "";
  const known = [
    "not-configured",
    "provider-busy",
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
  return Response.json(
    { code: known.includes(code) ? code : "service-unavailable" },
    {
      status:
        code === "input-too-large"
          ? 413
          : ["invalid-audio", "invalid-input"].includes(code)
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
