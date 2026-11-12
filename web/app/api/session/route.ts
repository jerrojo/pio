import {
  allow,
  equalSecret,
  newSession,
  readLimited,
  sameOrigin,
} from "../../../lib/security";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!allow("signin", 5)) return new Response(null, { status: 429 });
  if (Number(request.headers.get("content-length")) > 1000)
    return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(
      new TextDecoder().decode(await readLimited(request, 1000)),
    );
  } catch {
    return new Response(null, { status: 400 });
  }
  const code =
    body && typeof body === "object" && "code" in body ? body.code : "";
  if (
    typeof code !== "string" ||
    code.length > 200 ||
    !process.env.PIO_ACCESS_CODE ||
    !equalSecret(code, process.env.PIO_ACCESS_CODE)
  )
    return new Response(null, { status: 401 });
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `pio_session=${newSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        "Cache-Control": "no-store",
      },
    },
  );
}
