'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push(params.get('next') || '/');
      router.refresh();
    } else {
      // A 5xx from the server is an HTML page, not JSON — don't let the parse
      // throw and leave the form stuck on "Signing in…".
      const msg = await res
        .json()
        .then((d) => d.error as string | undefined)
        .catch(() => null);
      setError(msg || `Login failed (${res.status})`);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 card p-8 animate-fade-up">
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber text-[rgb(var(--ink))] text-xl font-bold">₹</div>
        <div>
          <div className="text-lg font-extrabold leading-tight tracking-tight">MoneyTracker</div>
          <div className="text-sm text-muted">Sign in to your account</div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
        <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted mb-1.5">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input" />
      </div>
      {error && <div className="text-xs text-debit">{error}</div>}
      <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">{busy ? 'Signing in…' : 'Sign in'}</button>
      <div className="text-center text-sm text-muted">
        No account?{' '}
        <Link href="/signup" className="text-accent font-medium hover:underline">Create one</Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
