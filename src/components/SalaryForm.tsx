'use client';

import { useEffect, useState } from 'react';

/**
 * Configure the auto-salary credit (added on the salary day each month by
 * sync/cron). Amount + day are stored in the DB.
 */
export default function SalaryForm() {
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const d = await fetch('/api/salary').then((r) => r.json());
    setEnabled(Boolean(d.salaryEnabled));
    setAmount(d.salaryAmount ? String(d.salaryAmount) : '');
    setDay(String(d.salaryDay ?? 1));
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaryEnabled: enabled, salaryAmount: amount, salaryDay: Number(day) }),
      });
      if (!res.ok) throw new Error('Save failed');
      setMsg('Saved ✓ — applied on the next sync.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-card">
      <div>
        <h2 className="text-sm font-semibold">Auto salary</h2>
        <p className="text-xs text-muted">Adds a salary credit each month on the chosen day. Runs on sync.</p>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable monthly auto-salary
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-muted mb-1">Amount (₹)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="75417"
            inputMode="decimal"
            className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm tabular"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Day of month</label>
          <input
            value={day}
            onChange={(e) => setDay(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm tabular"
          />
        </div>
      </div>

      {msg && <div className="text-xs text-credit">{msg}</div>}
      <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {saving ? 'Saving…' : 'Save salary settings'}
      </button>
    </section>
  );
}
