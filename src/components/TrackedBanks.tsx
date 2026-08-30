'use client';

import { useCallback, useEffect, useState } from 'react';

interface BuiltIn { name: string; senders: string[] }

export default function TrackedBanks() {
  const [builtIn, setBuiltIn] = useState<BuiltIn[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [sender, setSender] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch('/api/banks', { cache: 'no-store' }).then((r) => r.json());
    setBuiltIn(d.builtIn ?? []);
    setCustom(d.custom ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!sender.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/banks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: sender.trim() }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setSender('');
      setMsg('Added — its emails will be included on the next sync.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }
  async function remove(s: string) {
    await fetch(`/api/banks?sender=${encodeURIComponent(s)}`, { method: 'DELETE' });
    await load();
  }

  return (
    <section className="card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Tracked bank emails</h2>
        <p className="text-xs text-muted">These sender addresses are scanned in your Gmail. Add your bank if it isn’t listed.</p>
      </div>

      {/* Built-in banks with parsers */}
      <div className="space-y-2">
        {builtIn.map((b) => (
          <div key={b.name} className="rounded-lg bg-surface-2 p-3">
            <div className="text-sm font-medium mb-1">{b.name} <span className="text-[10px] text-credit ml-1">✓ auto-parsed</span></div>
            <div className="flex flex-wrap gap-1.5">
              {b.senders.map((s) => (
                <span key={s} className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom senders */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium mb-2">Your added senders</div>
        {custom.length === 0 ? (
          <p className="text-xs text-muted mb-3">None yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {custom.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/30 pl-2.5 pr-1 py-0.5 text-xs font-mono text-accent">
                {s}
                <button onClick={() => remove(s)} className="h-4 w-4 rounded-full grid place-items-center hover:text-white hover:bg-debit" aria-label="Remove">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={sender} onChange={(e) => setSender(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="e.g. alerts@yourbank.com" className="input flex-1" />
          <button onClick={add} disabled={busy} className="btn-primary px-4 py-2">Add</button>
        </div>
        {msg && <div className="mt-2 text-xs text-credit">{msg}</div>}
        <p className="mt-2 text-[11px] text-muted">
          Added banks are <span className="font-medium">fetched</span> right away. If their format isn’t recognized yet, those emails
          show up as <span className="font-medium">unparsed</span> below — that’s the signal a new parser template is needed.
        </p>
      </div>
    </section>
  );
}
