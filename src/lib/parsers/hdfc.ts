import { EmailInput, ParseResult, Parser, ignoredReason, last4, parseAmount, parseDateTime } from './types';

/**
 * HDFC Bank "InstaAlerts" templates (alerts@hdfcbank.bank.in), plus older
 * formats kept as fallbacks. Match against subject + plaintext body.
 *
 * Real UPI debit (current format):
 *   "Rs.154.59 is debited from your account ending 5427 towards VPA
 *    payzomato@hdfcbank (ZOMATO) on 28-08-26. UPI transaction reference no.:
 *    156522854212."
 * The parenthetical (ZOMATO) is the clean merchant name — prefer it over the VPA.
 * For person-to-person transfers the parenthetical is the person's name.
 *
 * Real UPI credit:
 *   "Rs.2,000.00 is credited to your account ending 5427 ... VPA name@bank (NAME)
 *    on 28-08-26. UPI transaction reference no.: ..."
 */

// Prefer the parenthetical merchant name; fall back to the VPA handle.
function pickMerchant(vpa: string, parenthetical: string | undefined): string {
  const name = parenthetical?.trim();
  if (name) return name;
  return vpa.trim();
}

export const hdfcParser: Parser = (email: EmailInput): ParseResult => {
  const ignore = ignoredReason(email);
  if (ignore) return { status: 'ignored', reason: ignore };

  const body = (email.bodyText || '').replace(/\s+/g, ' ');
  const when = parseDateTime(body, email.receivedAt);
  const ref = body.match(/UPI transaction reference no\.?:?\s*(\w+)/i)?.[1] ?? body.match(/reference number is\s*(\w+)/i)?.[1] ?? null;

  // ── InstaAlerts UPI debit ────────────────────────────────────────────────
  let m = body.match(
    /Rs\.?\s*([\d,]+\.?\d*)\s+is debited from your account ending\s*(\d{3,4})\s+towards VPA\s+(\S+?)\s*(?:\(([^)]+)\))?\s+on\b/i,
  );
  if (m) {
    const amount = parseAmount(m[1]);
    if (amount != null) {
      return {
        status: 'parsed',
        txn: { amount, direction: 'debit', rawMerchant: pickMerchant(m[3], m[4]), occurredAt: when, accountLast4: last4(m[2]), instrument: 'upi', referenceId: ref },
      };
    }
  }

  // ── InstaAlerts UPI credit ───────────────────────────────────────────────
  m = body.match(
    /Rs\.?\s*([\d,]+\.?\d*)\s+is credited to your account ending\s*(\d{3,4})\s+(?:.*?)VPA\s+(\S+?)\s*(?:\(([^)]+)\))?\s+on\b/i,
  );
  if (m) {
    const amount = parseAmount(m[1]);
    if (amount != null) {
      return {
        status: 'parsed',
        txn: { amount, direction: 'credit', rawMerchant: pickMerchant(m[3], m[4]), occurredAt: when, accountLast4: last4(m[2]), instrument: 'upi', referenceId: ref },
      };
    }
  }

  // ── "deducted ... and added to <TARGET> account on" (EMI / ACH / mandate) ─
  m = body.match(/(?:Rs\.?\s*)?INR\s*([\d,]+\.?\d*)\s+is deducted from your account ending\s*(?:XX)?(\d{3,4})\s+and added to\s+(.+?)\s+account on\b/i);
  if (m) {
    const amount = parseAmount(m[1]);
    if (amount != null) {
      const instrument = /\bACH\b|EMI|mandate/i.test(m[3]) ? 'auto_debit' : 'netbanking';
      return {
        status: 'parsed',
        txn: { amount, direction: 'debit', rawMerchant: m[3].trim(), occurredAt: when, accountLast4: last4(m[2]), instrument, referenceId: ref },
      };
    }
  }

  // ── Plain credit into own account (salary / NEFT / IMPS in) ──────────────
  m = body.match(/(?:Rs\.?\s*)?(?:Rs|INR)\.?\s*([\d,]+\.?\d*)\s+(?:has been )?(?:successfully )?credited to your (?:HDFC Bank )?account ending(?: in)?\s*(\d{3,4})/i);
  if (!m) m = body.match(/(?:Amount received:|received a credit).*?(?:Rs|INR)\.?\s*([\d,]+\.?\d*).*?(?:XX|ending(?: in)?\s*)(\d{3,4})/i);
  if (m) {
    const amount = parseAmount(m[1]);
    if (amount != null) {
      // Best-effort payer: "Reference Details: FT- Sahil ..." → the narration.
      const payer = body.match(/Reference Details?:\s*([A-Za-z][\w .&\/-]{2,40})/i)?.[1]?.trim();
      return {
        status: 'parsed',
        txn: { amount, direction: 'credit', rawMerchant: payer || 'BANK CREDIT', occurredAt: when, accountLast4: last4(m[2]), instrument: 'netbanking', referenceId: ref },
      };
    }
  }

  // ── Card transaction — two known orderings ───────────────────────────────
  // (a) "...spent on Card ending 4471 at MERCHANT on ..."  [amount, last4, merchant]
  let card = body.match(/(?:Rs|INR)\.?\s*([\d,]+\.?\d*)\s+(?:has been|is|was)?\s*(?:spent|used).*?Card\s+(?:ending|no\.?\s*(?:XX)?)\s*(\d{4})\s+(?:at|towards)\s+(.+?)\s+on\b/i);
  let cardAmount: string | undefined, cardLast4: string | undefined, cardMerchant: string | undefined;
  if (card) {
    [, cardAmount, cardLast4, cardMerchant] = card;
  } else {
    // (b) "Card ending 4471 for Rs.X at MERCHANT on ..."  [last4, amount, merchant]
    card = body.match(/Card ending\s*(\d{4})\s+for\s+(?:Rs|INR)\.?\s*([\d,]+\.?\d*)\s+at\s+(.+?)\s+on\b/i);
    if (card) [, cardLast4, cardAmount, cardMerchant] = card;
  }
  if (cardAmount && cardLast4 && cardMerchant) {
    const amount = parseAmount(cardAmount);
    if (amount != null) {
      return {
        status: 'parsed',
        txn: { amount, direction: 'debit', rawMerchant: cardMerchant.trim(), occurredAt: when, accountLast4: cardLast4, instrument: 'card', referenceId: null },
      };
    }
  }

  // ── Legacy: "debited from account **1234 to VPA X on" ────────────────────
  m = body.match(/Rs\.?\s*([\d,]+\.?\d*)\s+(?:has been|is)?\s*debited from (?:your )?account\s*\**(\d{2,4})?\s*to (?:VPA )?([^\s.]+)/i);
  if (m) {
    const amount = parseAmount(m[1]);
    if (amount != null) {
      return {
        status: 'parsed',
        txn: { amount, direction: 'debit', rawMerchant: m[3].trim(), occurredAt: when, accountLast4: m[2] ? last4(m[2]) : null, instrument: 'upi', referenceId: ref },
      };
    }
  }

  // ── Generic netbanking/IMPS debit fallback ───────────────────────────────
  m = body.match(/Rs\.?\s*([\d,]+\.?\d*)\s+(?:has been )?debited.*?(?:towards|to)\s+(.+?)\s+(?:on|via)\b/i);
  if (m) {
    const amount = parseAmount(m[1]);
    if (amount != null) {
      return {
        status: 'parsed',
        txn: { amount, direction: 'debit', rawMerchant: m[2].trim(), occurredAt: when, accountLast4: null, instrument: 'netbanking', referenceId: ref },
      };
    }
  }

  return { status: 'unparsed' };
};
