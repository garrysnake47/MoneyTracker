/**
 * Bank sender addresses (spec §4.2 / §5.1). Adding a new bank = adding an entry
 * here plus a parser module keyed by one of these senders. No other code change.
 *
 * `senders` are matched case-insensitively against the raw From: address.
 * `parser` is the key registered in src/lib/parsers/index.ts.
 */
export interface BankConfig {
  key: string;
  displayName: string;
  senders: string[];
  parser: string; // parser module key
}

export const BANKS: BankConfig[] = [
  {
    key: 'hdfc',
    displayName: 'HDFC Bank',
    senders: ['alerts@hdfcbank.net', 'alerts@hdfcbank.com', 'alerts@hdfcbank.bank.in', 'emailstatements.cc@hdfcbank.net'],
    parser: 'hdfc',
  },
  {
    key: 'icici',
    displayName: 'ICICI Bank',
    senders: ['alerts@icicibank.com', 'credit_cards@icicibank.com', 'noreply@icicibank.com'],
    parser: 'icici',
  },
  {
    key: 'sbi',
    displayName: 'State Bank of India',
    senders: ['sbiinb@sbi.co.in', 'alerts@sbi.co.in', 'donotreply.sbicard@sbicard.com'],
    parser: 'sbi',
  },
  {
    key: 'axis',
    displayName: 'Axis Bank',
    senders: ['alerts@axisbank.com', 'cc.statements@axisbank.com'],
    parser: 'axis',
  },
];

/** All configured sender addresses, lowercased — used to build the Gmail query. */
export function allSenders(): string[] {
  return BANKS.flatMap((b) => b.senders).map((s) => s.toLowerCase());
}

/** Resolve the parser key for a raw From: header, or null if unknown. */
export function parserForSender(from: string): string | null {
  const lower = from.toLowerCase();
  for (const bank of BANKS) {
    if (bank.senders.some((s) => lower.includes(s.toLowerCase()))) return bank.parser;
  }
  return null;
}
