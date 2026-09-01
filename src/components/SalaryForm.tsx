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
    const d = await fetch('/api/salary', { cache: 'no-store' }).then((r) => r.json());
    setEnabled(Boolean(d.salaryEnabled));
    setAmount(d.salaryAmount ? String(d.salaryAmount) : '');
    setDay(String(d.salaryDay ?? 1));
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (enabled && !(Number(amount) > 0)) {
      setMsg('Enter a salary amount above 0 — auto-salary needs one to credit.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaryEnabled: enabled, salaryAmount: amount, salaryDay: Number(day) }),
      });
      if (!res.ok) throw new Error('Save failed');
      const d = await res.json().catch(() => ({}));
      // Re-read so the field shows what was actually persisted — a blank amount
      // is silently ignored by the API, and the placeholder made that look saved.
      await load();
      setMsg(
        d.salaryCredited
          ? 'Saved ✓ — this month’s salary credit was added.'
          : `Saved ✓ — ${d.salaryReason === 'already credited this month' ? 'already credited this month' : d.salaryReason === 'disabled' ? 'auto-salary is off' : `next credit ${d.salaryReason ?? 'on the next sync'}`}.`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5 space-y-3">
      <div>
        <h2 className="text-[15px] font-bold">Auto salary</h2>
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
            placeholder="e.g. 75000"
            inputMode="decimal"
            className="input tabular"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Day of month</label>
          <input
            value={day}
            onChange={(e) => setDay(e.target.value)}
            inputMode="numeric"
            className="input tabular"
          />
        </div>
      </div>

      {msg && <div className={`text-xs ${msg.startsWith('Saved') ? 'text-credit' : 'text-debit'}`}>{msg}</div>}
      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? 'Saving…' : 'Save salary settings'}
      </button>
    </section>
  );
}
