import { test, expect } from '@fixtures/test.fixture';
import { BankAccountFactory } from '@test-data/factories/bank-account.factory';
import { describeTest } from '@utils/allure-meta';

test.describe('Bank accounts', { tag: ['@accounts'] }, () => {
  test.beforeEach(async () => {
    await describeTest({
      epic: 'Accounts',
      feature: 'Linked bank accounts',
      severity: 'normal',
      tms: 'ACC-001',
    });
  });

  test('user links a new bank account and can soft-delete it', async ({ personas, openSessionAs }) => {
    const owner = await personas.create();
    const app = await openSessionAs(owner);
    const account = BankAccountFactory.build();

    await app.bankAccounts.open();
    await app.bankAccounts.addAccount(account);

    await test.step('Account is persisted for the owner (API)', async () => {
      const accounts = await owner.api.bankAccounts.list();
      expect(accounts.map(({ bankName }) => bankName)).toContain(account.bankName);
    });

    await app.bankAccounts.deleteAccount(account.bankName);
  });
});
