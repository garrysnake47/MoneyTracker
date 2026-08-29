import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, createSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const pw = String(password ?? '');

  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user || !verifyPassword(pw, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
