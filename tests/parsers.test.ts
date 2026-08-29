import { describe, it, expect } from 'vitest';
import { parseEmail } from '@/lib/parsers';
import { hdfcFixtures } from './fixtures/hdfc';
import { iciciFixtures } from './fixtures/icici';
import type { Fixture } from './fixtures/hdfc';

function runFixtures(name: string, fixtures: Fixture[]) {
  describe(name, () => {
    for (const f of fixtures) {
      it(f.name, () => {
        const result = parseEmail(f.email);
        expect(result.status).toBe(f.expect.status);
        if (f.expect.status === 'parsed' && result.status === 'parsed') {
          expect(result.txn.amount).toBe(f.expect.amount);
          expect(result.txn.direction).toBe(f.expect.direction);
          expect(result.txn.instrument).toBe(f.expect.instrument);
          expect(result.txn.rawMerchant.toLowerCase()).toContain(f.expect.rawMerchantIncludes.toLowerCase());
          if (f.expect.last4 !== undefined) expect(result.txn.accountLast4).toBe(f.expect.last4);
        }
      });
    }
  });
}

runFixtures('HDFC', hdfcFixtures);
runFixtures('ICICI', iciciFixtures);
