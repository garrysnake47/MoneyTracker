import { NextRequest, NextResponse } from 'next/server';
import { getUserSalary, saveUserSalary } from '@/lib/salary';
import { requireUser } from '@/lib/session-server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  const s = await getUserSalary(userId);
  return NextResponse.json({ salaryEnabled: s.salaryEnabled, salaryAmount: s.salaryAmount ?? '', salaryDay: s.salaryDay });
}

export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  const body = await req.json().catch(() => ({}));
  await saveUserSalary(userId, body);
  return NextResponse.json({ ok: true });
}
