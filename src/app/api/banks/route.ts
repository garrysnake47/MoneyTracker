import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/session-server';
import { BANKS } from '@/config/banks';

export const runtime = 'nodejs';

/** GET: built-in bank senders (with a parser) + this user's custom senders. */
export async function GET(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { customSenders: true } });
  return NextResponse.json({
    builtIn: BANKS.map((b) => ({ name: b.displayName, senders: b.senders })),
    custom: user?.customSenders ?? [],
  });
}

/** POST: add a custom sender { sender }. Emails from it get fetched on next sync. */
export async function POST(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  const body = await req.json().catch(() => ({}));
  const sender = String(body.sender ?? '').trim().toLowerCase();
  if (!sender || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sender)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { customSenders: true } });
  const set = new Set([...(user?.customSenders ?? []), sender]);
  await prisma.user.update({ where: { id: userId }, data: { customSenders: Array.from(set) } });
  return NextResponse.json({ ok: true });
}

/** DELETE: remove a custom sender (?sender=...). */
export async function DELETE(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;
  const sender = (req.nextUrl.searchParams.get('sender') ?? '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { customSenders: true } });
  const next = (user?.customSenders ?? []).filter((s) => s !== sender);
  await prisma.user.update({ where: { id: userId }, data: { customSenders: next } });
  return NextResponse.json({ ok: true });
}
