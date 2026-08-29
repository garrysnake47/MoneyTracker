'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmtDateTime } from '@/lib/format';

interface Health {
  statusCounts: Record<string, number>;
  unparsedBySender: { sender: string; count: number }[];
  samples: { id: number; sender: string; subject: string; receivedAt: string; parseError: string | null; bodyPreview: string }[];
}

export default function ParserHealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [reparsing, setReparsing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/parser-health');
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reparse() {
    setReparsing(true);
    await fetch('/api/parse', { method: 'POST' });
    await load();
    setReparsing(false);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parser health</h1>
          <p className="text-sm text-muted">Unparsed emails are the discovery mechanism for new bank templates.</p>
        </div>
        <button onClick={reparse} disabled={reparsing} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {reparsing ? 'Re-parsing…' : 'Re-parse pending'}
        </button>
      </header>

      {loading || !data ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['pending', 'parsed', 'ignored', 'unparsed'].map((k) => (
              <div key={k} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-xs text-muted capitalize">{k}</div>
                <div className="text-xl font-semibold tabular">{data.statusCounts[k] ?? 0}</div>
              </div>
            ))}
          </div>

          {data.unparsedBySender.length > 0 && (
            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold mb-2">Unparsed by sender</h2>
              <ul className="text-sm divide-y divide-border">
                {data.unparsedBySender.map((s) => (
                  <li key={s.sender} className="flex justify-between py-1.5">
                    <span className="font-mono truncate mr-3">{s.sender}</span>
                    <span className="text-debit">{s.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Unparsed samples</h2>
            {data.samples.length === 0 ? (
              <p className="text-sm text-muted">No unparsed emails — every template matched. 🎯</p>
            ) : (
              data.samples.map((s) => (
                <details key={s.id} className="rounded-lg border border-border bg-surface p-3">
                  <summary className="cursor-pointer text-sm">
                    <span className="font-medium">{s.subject || '(no subject)'}</span>
                    <span className="text-muted"> · {s.sender} · {fmtDateTime(s.receivedAt)}</span>
                  </summary>
                  {s.parseError && <div className="mt-2 text-xs text-debit">error: {s.parseError}</div>}
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted bg-surface-2 rounded p-2">{s.bodyPreview}</pre>
                </details>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
