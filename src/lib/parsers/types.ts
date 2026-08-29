export type Direction = 'debit' | 'credit';
export type Instrument = 'upi' | 'card' | 'netbanking' | 'atm' | 'auto_debit' | 'unknown';

/** Fields a parser extracts from one email (spec §5.2). */
export interface ParsedTxn {
  amount: number; // always positive
  direction: Direction;
  rawMerchant: string;
  occurredAt: Date; // txn time from the message
  accountLast4: string | null;
  instrument: Instrument;
  referenceId: string | null;
}

export type ParseResult =
  | { status: 'parsed'; txn: ParsedTxn }
  | { status: 'ignored'; reason: string } // OTP / promo / statement — not a txn
  | { status: 'unparsed' }; // matched no template — surface in parser-health

/** The input a parser sees. Mirrors the persisted RawEmail (minus DB fields). */
export interface EmailInput {
  sender: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
}

export type Parser = (email: EmailInput) => ParseResult;

// ── Shared helpers ──────────────────────────────────────────────────────────

/** Parse an Indian-format amount string ("1,234.50", "Rs. 499") into a number. */
export function parseAmount(s: string): number | null {
  const cleaned = s.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Last 4 digits from a masked account/card token like "XXXX1234" or "ac **1234". */
export function last4(s: string): string | null {
  const m = s.match(/(\d{4})(?!.*\d)/); // last run of 4+ digits, take final 4
  return m ? m[1] : null;
}

/**
 * Parse a date/time found in the body. Indian alerts vary wildly:
 * "28-08-2026 14:32:10", "28/08/26", "28-Aug-2026", "On 28-08-2026 at 14:32".
 * Falls back to the email received time when no date is present in the body.
 *
 * When a date is present but NO time-of-day (common for UPI alerts), we borrow
 * the time-of-day from the email's received timestamp. Bank alerts arrive within
 * seconds of the transaction, so this is a far better occurred_at than midnight —
 * and it lets §5.3 dedup match a date-only UPI alert against a timestamped card
 * alert for the same purchase.
 */
// Indian bank alerts state times in IST (UTC+5:30, no DST). Interpreting the
// body components as IST makes occurred_at a correct absolute instant regardless
// of the server timezone (Vercel runs in UTC) — and keeps date-only UPI alerts
// and timestamped card alerts in the same frame so §5.3 dedup works in prod.
const IST_OFFSET_MIN = 330;

function istToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number): Date {
  return new Date(Date.UTC(y, mo, d, h, mi, s) - IST_OFFSET_MIN * 60000);
}

// The IST wall-clock time-of-day of an absolute timestamp.
function istTimeParts(absolute: Date): { h: number; mi: number; s: number } {
  const shifted = new Date(absolute.getTime() + IST_OFFSET_MIN * 60000);
  return { h: shifted.getUTCHours(), mi: shifted.getUTCMinutes(), s: shifted.getUTCSeconds() };
}

function build(year: number, month: number, day: number, h: string | undefined, m: string | undefined, s: string | undefined, fallback: Date): Date {
  if (h == null) {
    // No time in the body: borrow the fallback's IST time-of-day on the parsed date.
    const p = istTimeParts(fallback);
    return istToUtc(year, month, day, p.h, p.mi, p.s);
  }
  return istToUtc(year, month, day, Number(h), Number(m ?? 0), Number(s ?? 0));
}

export function parseDateTime(body: string, fallback: Date): Date {
  // dd-Mon-yyyy [hh:mm[:ss]]
  const named = body.match(/(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (named) {
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const mo = months[named[2].toLowerCase()];
    if (mo !== undefined) {
      let year = Number(named[3]);
      if (year < 100) year += 2000;
      return build(year, mo, Number(named[1]), named[4], named[5], named[6], fallback);
    }
  }
  // dd-mm-yyyy or dd/mm/yy [hh:mm[:ss]]
  const numeric = body.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (numeric) {
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;
    return build(year, Number(numeric[2]) - 1, Number(numeric[1]), numeric[4], numeric[5], numeric[6], fallback);
  }
  return fallback;
}

/** Recognize non-transaction mails (OTP, promo, statement) — mark ignored. */
export function ignoredReason(email: EmailInput): string | null {
  const hay = `${email.subject}\n${email.bodyText}`.toLowerCase();
  const movedMoney = /debited|credited|deducted|is debited|spent|withdrawn|received a credit/.test(hay);

  if (/\botp\b|one[- ]time password|verification code|secure code/.test(hay)) return 'otp';
  if (/e-?statement|monthly statement|account statement|statement is ready|recent \d+ days transactions|password[- ]protected pdf|password to ac/.test(hay)) return 'statement';
  // AutoPay / e-mandate lifecycle notices (set up / cancelled / modified) — no money moved.
  if (/e-?mandate|autopay/.test(hay) && !movedMoney) return 'mandate_notice';
  if (/unsubscribe|offer|cashback offer|great deals|pre-approved|congratulations/.test(hay) && !movedMoney) return 'promo';
  return null;
}
