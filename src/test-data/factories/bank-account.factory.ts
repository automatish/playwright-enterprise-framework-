import { faker } from '@faker-js/faker';
import type { NewBankAccount } from '@test-data/models/bank-account.model';

export const BankAccountFactory = {
  /** RWA's UI enforces a 9-digit routing number and a 9-12 digit account number. */
  build(overrides: Partial<NewBankAccount> = {}): NewBankAccount {
    return {
      bankName: `${faker.company.name().slice(0, 20)} Bank`,
      routingNumber: faker.string.numeric(9),
      accountNumber: faker.string.numeric({ length: { min: 9, max: 12 } }),
      ...overrides,
    };
  },
} as const;
