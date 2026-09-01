'use client';

import Link from 'next/link';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'SBI Card', 'UPI'];

const FEATURES = [
  {
    icon: 'transactions',
    tint: 'bg-sky text-[rgb(var(--peri-2))]',
    title: 'Reads your bank emails',
    body: 'Connect Gmail once. Every HDFC, ICICI, SBI and Axis alert — UPI, card, netbanking, auto-debit — is parsed into a clean transaction. Nothing is typed by hand.',
  },
  {
    icon: 'keywords',
    tint: 'bg-mint text-[rgb(var(--credit))]',
    title: 'Categorises itself',
    body: 'Merchant rules catch the regulars instantly. Anything new goes to an AI pass, then to a review queue where one keystroke files it — and teaches the rule for next time.',
  },
  {
    icon: 'creditcard',
    tint: 'bg-lilac text-[rgb(var(--peri-2))]',
    title: 'Credit cards, counted correctly',
    body: 'Card charges count as spend but never leave your balance. Register a card by its last four digits and its charges track separately until the bill is paid.',
  },
  {
    icon: 'budget',
    tint: 'bg-sand text-[rgb(var(--amber-2))]',
    title: 'Budgets that hold up',
    body: 'Set a monthly cap per category and watch it fill. Transfers between your own accounts and card bill payments are excluded, so the number means something.',
  },
  {
    icon: 'subscriptions',
    tint: 'bg-blush text-[rgb(var(--debit))]',
    title: 'Finds your subscriptions',
    body: 'Recurring charges are detected from your own history — cadence, median amount, next expected date — including the ones that quietly changed price.',
  },
  {
    icon: 'overview',
    tint: 'bg-mint text-[rgb(var(--credit))]',
    title: 'A month you can read',
    body: 'Week-by-week category spend, money in versus money out, savings rate and top merchants. The whole month on one screen, in rupees.',
  },
];

const STEPS = [
  { n: '01', title: 'Sign in with Gmail', body: 'Read-only access, scoped to bank alert senders. Your mail is never modified.' },
  { n: '02', title: 'Alerts become transactions', body: 'Parsers pull out amount, merchant, date, instrument and account — duplicates merged.' },
  { n: '03', title: 'Review once, done forever', body: 'Confirm the handful the rules missed. Every decision becomes a rule for next month.' },
];

const FAQ = [
  { q: 'Do you ever see my banking password?', a: 'No. MoneyTracker never touches your bank — it only reads the alert emails your bank already sends you, through Gmail’s read-only API.' },
  { q: 'Which banks work?', a: 'HDFC, ICICI, SBI and Axis ship with parsers, covering UPI, card, netbanking and auto-debit alerts. Any other sender can be added, and unrecognised formats are surfaced so a template can be written.' },
  { q: 'Where does my data live?', a: 'In your own Postgres database, on your own deployment. It is self-hosted by design — there is no shared server holding your statements.' },
  { q: 'What about cash?', a: 'Add it manually in a few seconds. Manual entries are locked so the categoriser never overwrites them.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[rgb(var(--bg))]/75 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber text-[rgb(var(--ink))] text-lg font-bold">₹</span>
            <span className="text-[15px] font-extrabold tracking-tight">MoneyTracker</span>
          </Link>
          <nav className="ml-auto hidden sm:flex items-center gap-1 text-sm font-medium text-muted">
            <a href="#features" className="px-3 py-2 rounded-full hover:text-text hover:bg-surface-2 transition-colors">Features</a>
            <a href="#how" className="px-3 py-2 rounded-full hover:text-text hover:bg-surface-2 transition-colors">How it works</a>
            <a href="#faq" className="px-3 py-2 rounded-full hover:text-text hover:bg-surface-2 transition-colors">FAQ</a>
          </nav>
          <div className="ml-auto sm:ml-3 flex items-center gap-2">
            {/* The hero's "I have an account" covers sign-in on small screens. */}
            <Link href="/login" className="btn-ghost hidden xs:inline-flex whitespace-nowrap">Sign in</Link>
            <Link href="/signup" className="btn-primary whitespace-nowrap px-4 sm:px-5">Get started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-5 pt-14 pb-8 sm:pt-20">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted shadow-card">
              <span className="h-1.5 w-1.5 rounded-full bg-credit" />
              Built for Indian bank &amp; UPI alerts
            </div>

            <h1 className="animate-fade-up mt-5 text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-tight" style={{ animationDelay: '60ms' }}>
              <span className="sheen">Every rupee</span>,
              <br />
              accounted for.
            </h1>

            <p className="animate-fade-up mt-5 text-[17px] leading-relaxed text-muted max-w-lg" style={{ animationDelay: '120ms' }}>
              Your bank already emails you every transaction. MoneyTracker reads those alerts, sorts them into categories,
              and turns a year of noise into a monthly picture you can actually act on.
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '180ms' }}>
              <Link href="/signup" className="btn-primary px-6 py-3 text-[15px]">
                Start tracking — free
                <span aria-hidden>→</span>
              </Link>
              <Link href="/login" className="btn-outline px-6 py-3 text-[15px]">I have an account</Link>
            </div>

            <p className="animate-fade-up mt-4 text-xs text-muted" style={{ animationDelay: '220ms' }}>
              Self-hosted · read-only Gmail access · your data stays in your database
            </p>
          </div>

          {/* Dashboard preview */}
          <Reveal delay={80}>
            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-[rgb(var(--tint-sand))] via-transparent to-[rgb(var(--tint-sky))] blur-2xl" aria-hidden />
              <HeroPreview />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Bank marquee ─────────────────────────────────────────────────── */}
      <section className="py-10 border-y border-border/60 bg-surface/50">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-5">Reads alerts from</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-3">
            {[...BANKS, ...BANKS, ...BANKS, ...BANKS].map((b, i) => (
              <span key={i} className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold whitespace-nowrap">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <Reveal>
          <h2 className="text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold tracking-tight max-w-2xl">
            The boring part is the whole point.
          </h2>
          <p className="mt-3 text-muted max-w-xl">
            Expense apps fail because logging expenses is work. This one does the logging, and asks you only what it genuinely can’t infer.
          </p>
        </Reveal>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <article className="card lift h-full p-6">
                <span className={`tile h-11 w-11 ${f.tint}`}><Icon name={f.icon} size={20} /></span>
                <h3 className="mt-4 text-[17px] font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="bg-[rgb(var(--ink))] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <h2 className="text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold tracking-tight">Set up in three steps.</h2>
            <p className="mt-3 text-white/60 max-w-xl">Roughly five minutes, then it runs itself on a daily schedule.</p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative">
                  <div className="text-[13px] font-mono font-bold text-[rgb(var(--amber))]">{s.n}</div>
                  <div className="mt-3 h-px w-full bg-white/15" />
                  <h3 className="mt-4 text-lg font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <Reveal>
          <div className="card p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="chip bg-mint text-[rgb(var(--credit))]">Private by construction</span>
              <h2 className="mt-4 text-[clamp(1.7rem,3.5vw,2.3rem)] font-extrabold tracking-tight">
                Nobody else holds your statements.
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                MoneyTracker is self-hosted. You deploy it, you own the database, and the only thing it ever asks of Google is
                permission to <em>read</em> mail from the bank senders you list. No credentials, no screen-scraping, no third party
                sitting between you and your money.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                'Read-only Gmail scope — mail is never modified or deleted',
                'Bank passwords are never requested or stored',
                'Session cookies signed with your own secret',
                'Every row scoped to your user id',
                'Export everything to CSV whenever you want',
              ].map((point, i) => (
                <Reveal key={point} delay={i * 60}>
                  <li className="flex items-start gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-credit text-white text-xs">✓</span>
                    <span className="text-sm font-medium">{point}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-5 pb-20 sm:pb-24">
        <Reveal>
          <h2 className="text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold tracking-tight text-center">Questions, answered.</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="card group p-5 open:shadow-lg transition-shadow">
                <summary className="flex cursor-pointer items-center gap-4 list-none font-semibold">
                  {f.q}
                  <span className="ml-auto shrink-0 text-muted transition-transform duration-300 group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <Reveal>
          <div className="card-ink relative overflow-hidden p-10 sm:p-16 text-center">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[rgb(var(--amber))]/12 animate-float-slow" aria-hidden />
            <div className="absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-white/[0.04]" aria-hidden />
            <h2 className="relative text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold tracking-tight">
              Find out where it actually went.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-white/60">
              Connect Gmail and your last three months are categorised before you finish your coffee.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="btn-accent px-7 py-3 text-[15px]">Create your account</Link>
              <Link href="/login" className="btn px-7 py-3 text-[15px] border border-white/20 text-white hover:bg-white/10">Sign in</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center gap-3 text-sm text-muted">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber text-[rgb(var(--ink))] text-sm font-bold">₹</span>
            <span className="font-semibold text-text">MoneyTracker</span>
          </div>
          <p className="sm:ml-auto text-xs">Self-hosted expense tracking for Indian bank &amp; UPI alerts.</p>
        </div>
      </footer>
    </div>
  );
}

/* A miniature of the real dashboard — same tokens, same card language. */
function HeroPreview() {
  const bars = [
    { label: '1–7', parts: [42, 26, 18, 12] },
    { label: '8–14', parts: [30, 34, 14, 8] },
    { label: '15–21', parts: [52, 20, 22, 10] },
    { label: '22–28', parts: [36, 30, 12, 16] },
  ];
  const colors = ['rgb(var(--credit))', 'rgb(var(--peri))', 'rgb(var(--amber))', 'rgb(var(--debit))'];
  const max = Math.max(...bars.map((b) => b.parts.reduce((x, y) => x + y, 0)));

  return (
    <div className="animate-float rounded-[28px] border border-border bg-surface p-5 shadow-[0_40px_80px_-40px_rgb(26_28_31/0.45)]">
      {/* Mini KPI row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-[rgb(var(--ink))] p-3.5 text-white">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Total spend</div>
          <div className="mt-1 text-lg font-extrabold tabular">₹48,210</div>
        </div>
        <div className="rounded-2xl bg-mint p-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-[rgb(var(--credit))]">Money in</div>
          <div className="mt-1 text-lg font-extrabold tabular">₹75,417</div>
        </div>
        <div className="rounded-2xl bg-sand p-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-[rgb(var(--amber-2))]">Net saved</div>
          <div className="mt-1 text-lg font-extrabold tabular">₹27,207</div>
        </div>
      </div>

      {/* Mini stacked chart */}
      <div className="mt-4 rounded-2xl border border-border p-4">
        <div className="text-[11px] font-bold">Week-wise category spend</div>
        <div className="mt-4 flex h-32 items-end justify-between gap-3">
          {bars.map((b, bi) => {
            const total = b.parts.reduce((x, y) => x + y, 0);
            return (
              // h-full + justify-end so the percentage heights below resolve
              // against a definite height rather than an auto one.
              <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className="animate-grow flex w-full max-w-[38px] flex-col-reverse overflow-hidden rounded-t-lg"
                  style={{ height: `${(total / max) * 100}%`, animationDelay: `${bi * 110}ms` }}
                >
                  {b.parts.map((p, pi) => (
                    <div key={pi} style={{ flex: p, background: colors[pi] }} />
                  ))}
                </div>
                <span className="text-[9px] font-semibold text-muted">{b.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini activity rows */}
      <div className="mt-3 space-y-1.5">
        {[
          ['Swiggy', 'Food › Delivery', '−₹486', 'text-debit'],
          ['Salary', 'Income', '+₹75,417', 'text-credit'],
        ].map(([name, cat, amt, tone]) => (
          <div key={name} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
            <span className="h-6 w-6 rounded-full bg-surface grid place-items-center text-[10px]">{name[0]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold leading-tight">{name}</div>
              <div className="text-[9px] text-muted">{cat}</div>
            </div>
            <span className={`text-[11px] font-bold tabular ${tone}`}>{amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
