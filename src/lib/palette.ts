// Chart/category palette matching the app's design language: muted, warm,
// low-saturation tones that sit on white cards without shouting.
export const PALETTE = [
  '#F5B841', // amber
  '#8095F2', // periwinkle
  '#2A8A69', // forest
  '#D6584E', // terracotta
  '#6FA8DC', // sky
  '#A78BC4', // lilac
  '#E3B778', // sand
  '#86B49A', // sage
  '#C97B63', // clay
  '#7A808A', // slate
  '#5D6BC0', // indigo
  '#C9A227', // ochre
];

export const INK = '#1E2026';
export const AMBER = '#F5B841';
export const PERI = '#8095F2';
export const CREDIT = '#2A8A69';
export const DEBIT = '#D6584E';
export const MUTED = '#7A808A';

/* ───────────────────────────────────────────────────────────────────────────
   Category identity — one colour and one icon per category, keyed by NAME.
   Keying by name (not by list index) is what makes a category read the same
   on the donut, the bar chart, the transaction badge and the keyword group.
   Index-keyed colours drifted: "Food" was amber on the pie and periwinkle on
   the bar chart, and the income donut reused the expense colours because both
   lists started at index 0.
   ─────────────────────────────────────────────────────────────────────────── */

/** Deep enough to carry white text; used for dots, fills and solid tiles. */
export interface CategoryStyle {
  /** Saturated hex — chart fills, legend dots, solid tiles. */
  solid: string;
  /** Very light wash of `solid` — badge/chip backgrounds. */
  soft: string;
  /** Darkened `solid` — text and icons sitting on `soft`. Stays ≥4.5:1. */
  ink: string;
  icon: string;
}

/** Expense side: warm and earthy, spread across the hue wheel. */
const EXPENSE_HUES: Record<string, { solid: string; icon: string }> = {
  food: { solid: '#E0813C', icon: 'food' },
  emi: { solid: '#C2544B', icon: 'emi' },
  sip: { solid: '#2F8F6D', icon: 'sip' },
  transport: { solid: '#3D7FC1', icon: 'transport' },
  shopping: { solid: '#9B62B8', icon: 'shopping' },
  house: { solid: '#B07C3A', icon: 'house' },
  bills: { solid: '#D19A2B', icon: 'bills' },
  health: { solid: '#CC5F86', icon: 'health' },
  other: { solid: '#6D7484', icon: 'other' },
  uncategorized: { solid: '#8A909C', icon: 'other' },
};

/** Income side: deliberately a different family (greens/teals/violets) so an
 *  income slice can never be mistaken for the expense slice in the same seat. */
const INCOME_HUES: Record<string, { solid: string; icon: string }> = {
  salary: { solid: '#1F8A70', icon: 'salary' },
  bonus: { solid: '#4FA36B', icon: 'bonus' },
  extra: { solid: '#2E9BA8', icon: 'extra' },
  refund: { solid: '#5E8FD0', icon: 'refund' },
  interest: { solid: '#7A6FD0', icon: 'sip' },
  transfers: { solid: '#6E7BC6', icon: 'transfers' },
};

/** Fallbacks, so an unseeded or user-added category still gets a stable look. */
const EXPENSE_FALLBACK = ['#D6584E', '#E0813C', '#C9A227', '#9B62B8', '#3D7FC1', '#C97B63', '#B07C3A', '#CC5F86'];
const INCOME_FALLBACK = ['#2A8A69', '#2E9BA8', '#4FA36B', '#5E8FD0', '#7A6FD0', '#3F9D8C'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix `hex` toward white by `amount` (0 = unchanged, 1 = white). */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = rgbOf(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Mix `hex` toward black by `amount`. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = rgbOf(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * The colour + icon for a category, stable across every chart and badge.
 * `isExpense` picks which family to fall back into for unknown names, so a
 * user-added income category never lands on an expense colour.
 */
export function categoryStyle(name: string | null | undefined, isExpense = true): CategoryStyle {
  const key = (name ?? 'uncategorized').trim().toLowerCase();
  const known = EXPENSE_HUES[key] ?? INCOME_HUES[key];
  let solid: string;
  let icon: string;
  if (known) {
    solid = known.solid;
    icon = known.icon;
  } else {
    const pool = isExpense ? EXPENSE_FALLBACK : INCOME_FALLBACK;
    solid = pool[hash(key) % pool.length];
    icon = isExpense ? 'other' : 'salary';
  }
  return { solid, soft: tint(solid, 0.88), ink: shade(solid, 0.28), icon };
}

/** Convenience for charts, which only need the fill. */
export function categoryColor(name: string | null | undefined, isExpense = true): string {
  return categoryStyle(name, isExpense).solid;
}

/* ── Editorial copy + decoration ────────────────────────────────────────── */

/** One-line description shown under a category heading. */
const BLURBS: Record<string, string> = {
  food: 'Restaurants, cafes, groceries & more',
  emi: 'Loans & Buy Now Pay Later',
  sip: 'Mutual funds & investment platforms',
  transport: 'Cabs, fuel, tolls & travel',
  shopping: 'Online orders, clothing & electronics',
  house: 'Rent, maintenance & repairs',
  bills: 'Utilities, mobile & subscriptions',
  health: 'Medical, pharmacy & fitness',
  other: 'Everything that fits nowhere else',
  transfers: 'Money moved between accounts — not spend',
  salary: 'Regular pay from your employer',
  bonus: 'One-off payouts & incentives',
  extra: 'Side income and windfalls',
  refund: 'Money coming back to you',
};

export function categoryBlurb(name: string | null | undefined): string {
  return BLURBS[(name ?? '').trim().toLowerCase()] ?? 'Keywords filed under this category';
}

/**
 * Glyphs for the watermark cluster in a category card's top-right corner.
 * Purely decorative — three related icons so the card reads as that category
 * before you get to the text.
 */
const DECOR: Record<string, string[]> = {
  food: ['food', 'shopping', 'bills'],
  emi: ['creditcard', 'emi', 'piggy'],
  sip: ['sip', 'overview', 'budget'],
  transport: ['transport', 'wallet', 'calendar'],
  shopping: ['shopping', 'receipt', 'creditcard'],
  house: ['house', 'bills', 'wallet'],
  bills: ['bills', 'receipt', 'repeat'],
  health: ['health', 'receipt', 'wallet'],
  other: ['other', 'receipt', 'wallet'],
  transfers: ['transfers', 'wallet', 'income'],
  salary: ['salary', 'income', 'piggy'],
  bonus: ['bonus', 'extra', 'income'],
  extra: ['extra', 'income', 'piggy'],
};

export function categoryDecor(name: string | null | undefined, isExpense = true): string[] {
  const key = (name ?? '').trim().toLowerCase();
  return DECOR[key] ?? (isExpense ? ['wallet', 'receipt', 'budget'] : ['income', 'piggy', 'salary']);
}
