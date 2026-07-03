import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Versión desplegada: el cliente la consulta para auto-actualizarse */
export async function GET() {
  return NextResponse.json(
    { v: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
