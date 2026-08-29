/**
 * Anonymized HDFC email bodies with expected parse output (spec §5.4).
 * Add one fixture per template. Amounts/refs are fake.
 */
import type { EmailInput } from '@/lib/parsers/types';

export interface Fixture {
  name: string;
  email: EmailInput;
  expect:
    | { status: 'parsed'; amount: number; direction: 'debit' | 'credit'; rawMerchantIncludes: string; instrument: string; last4?: string | null }
    | { status: 'ignored' }
    | { status: 'unparsed' };
}

const base = { sender: 'alerts@hdfcbank.net', bodyHtml: null, receivedAt: new Date('2026-08-28T09:00:00Z') };

export const hdfcFixtures: Fixture[] = [
  {
    name: 'UPI debit to merchant VPA',
    email: {
      ...base,
      subject: 'You have done a UPI txn',
      bodyText:
        'Dear Customer, Rs.499.00 has been debited from account **1234 to VPA swiggy@ybl on 28-08-26. Your UPI transaction reference number is 422012345678.',
    },
    expect: { status: 'parsed', amount: 499, direction: 'debit', rawMerchantIncludes: 'swiggy', instrument: 'upi', last4: '1234' },
  },
  {
    name: 'Card transaction at merchant',
    email: {
      ...base,
      subject: 'Alert : Update on your HDFC Bank Card',
      bodyText:
        'Thank you for using your HDFC Bank Card ending 4471 for Rs.1,250.00 at BLINKIT BANGALORE on 28-08-2026 14:32:10. Not you? Call us.',
    },
    expect: { status: 'parsed', amount: 1250, direction: 'debit', rawMerchantIncludes: 'BLINKIT', instrument: 'card', last4: '4471' },
  },
  {
    name: 'UPI credit received',
    email: {
      ...base,
      subject: 'Money received',
      bodyText:
        'Rs.2,000.00 has been credited to your account **1234 from VPA ramesh@okaxis on 28-08-26. Your UPI transaction reference number is 422099887766.',
    },
    expect: { status: 'parsed', amount: 2000, direction: 'credit', rawMerchantIncludes: 'ramesh', instrument: 'upi', last4: '1234' },
  },
  {
    name: 'OTP is ignored',
    email: {
      ...base,
      subject: 'OTP for your transaction',
      bodyText: 'Your OTP for the transaction is 483920. Do not share it with anyone.',
    },
    expect: { status: 'ignored' },
  },
  {
    name: 'Promotional mail is ignored',
    email: {
      ...base,
      subject: 'Congratulations! You are pre-approved for a personal loan',
      bodyText: 'Great deals await you. Click here for offers. Unsubscribe anytime.',
    },
    expect: { status: 'ignored' },
  },
];
