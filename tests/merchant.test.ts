import { describe, it, expect } from 'vitest';
import { normalizeMerchant, looksLikeVpa } from '@/lib/merchant';

describe('merchant normalization (§6)', () => {
  it('strips rail prefix, order ref, and country token', () => {
    expect(normalizeMerchant('UPI/P2M/SWIGGY*ORDER12345/HDFC')).toContain('SWIGGY');
    expect(normalizeMerchant('UPI/P2M/SWIGGY*ORDER12345/HDFC')).not.toContain('12345');
  });

  it('strips POS, masked card, city and country', () => {
    const out = normalizeMerchant('POS 4471XXXX BLINKIT BANGALORE IN');
    expect(out).toContain('BLINKIT');
    expect(out).not.toContain('BANGALORE');
    expect(out).not.toMatch(/\bIN\b/);
  });

  it('keeps a bare person VPA as the merchant key', () => {
    expect(looksLikeVpa('john.doe@okhdfc')).toBe(true);
    expect(normalizeMerchant('john.doe@okhdfc')).toBe('JOHN.DOE@OKHDFC');
  });

  it('does not treat a merchant-with-VPA as a person transfer', () => {
    expect(looksLikeVpa('SWIGGY*ORDER/swiggy@ybl')).toBe(false);
  });
});
