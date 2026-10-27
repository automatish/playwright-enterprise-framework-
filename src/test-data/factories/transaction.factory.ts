import { faker } from '@faker-js/faker';
import type { NewTransaction } from '@test-data/models/transaction.model';
import { uniqueSuffix } from './unique';

export const TransactionFactory = {
  /**
   * Payment payload. RWA's API coerces `amount` with `toInt()`, so amounts are
   * whole dollars; fractional cents would be silently truncated server-side.
   */
  payment(receiverId: string, overrides: Partial<NewTransaction> = {}): NewTransaction {
    return {
      transactionType: 'payment',
      receiverId,
      amount: faker.number.int({ min: 5, max: 250 }),
      description: TransactionFactory.description(),
      privacyLevel: 'public',
      ...overrides,
    };
  },

  /** Unique, human-readable memo so a transaction can be located in any feed. */
  description(prefix = 'E2E'): string {
    return `${prefix} ${faker.commerce.productName()} ${uniqueSuffix()}`;
  },
} as const;
