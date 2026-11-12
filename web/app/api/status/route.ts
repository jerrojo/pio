import { locales } from "../../../lib/domain";
import { readyFor } from "../../../lib/services";
import { authorized } from "../../../lib/security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return Response.json(
    {
      access: authorized(request),
      canSignIn: !!process.env.PIO_ACCESS_CODE,
      ready: locales.filter(readyFor),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
