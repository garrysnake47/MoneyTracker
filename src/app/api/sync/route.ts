import { NextRequest, NextResponse } from 'next/server';
import { syncGmail } from '@/lib/gmail';
import { runParsePass } from '@/lib/parsePass';
import { runCategorizer } from '@/lib/categorize';
import { ensureSalaryCredit } from '@/lib/salary';
import { requireUser } from '@/lib/session-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Full ingestion pipeline for the current user: salary → fetch → parse → categorize. */
export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  try {
    const salary = await ensureSalaryCredit(userId);
    const sync = await syncGmail(userId);
    const parse = await runParsePass(userId);
    const categorize = await runCategorizer(userId);
    return NextResponse.json({ ok: true, salary, sync, parse, categorize });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
