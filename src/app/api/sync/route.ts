import { NextRequest, NextResponse } from 'next/server';
import { syncGmail } from '@/lib/gmail';
import { runParsePass } from '@/lib/parsePass';
import { runCategorizer } from '@/lib/categorize';
import { requireUser } from '@/lib/session-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Full ingestion pipeline for the current user: fetch → parse → categorize. */
export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  try {
    const sync = await syncGmail(userId);
    const parse = await runParsePass(userId);
    const categorize = await runCategorizer(userId);
    return NextResponse.json({ ok: true, sync, parse, categorize });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
