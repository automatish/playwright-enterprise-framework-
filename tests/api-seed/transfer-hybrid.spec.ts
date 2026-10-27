import { test, expect } from '@fixtures/test.fixture';
import { TransactionFactory } from '@test-data/factories/transaction.factory';
import { describeTest } from '@utils/allure-meta';
import { dollarsToCents } from '@utils/money';

/**
 * Hybrid API -> UI -> API test.
 *
 *   ARRANGE (API)  seed a funded sender and an empty recipient
 *   ACT     (UI)   sender verifies balance and performs the transfer
 *   ASSERT  (API)  business endpoints AND the raw database agree on the outcome
 *
 * Both personas are created for this test only, so exact balances can be
 * asserted safely under full parallelism and sharding.
 */
test.describe('Transfers: API-seeded hybrid flow', { tag: ['@hybrid', '@payments', '@critical'] }, () => {
  test.beforeEach(async () => {
    await describeTest({
      epic: 'Payments',
      feature: 'Balance integrity',
      story: 'Transfer debits sender and credits recipient exactly once',
      severity: 'critical',
      tms: 'PAY-002',
    });
  });

  test('API-seeded balance is transferred in the UI and persisted correctly', async ({
    personas,
    openSessionAs,
    anonymousApi,
  }) => {
    const openingBalance = dollarsToCents(1_000);
    const amount = 150;
    const description = TransactionFactory.description('Rent share');

    const { sender, recipient } = await test.step('ARRANGE: seed balances via API', async () => {
      const [sender, recipient] = await Promise.all([
        personas.create({ balance: openingBalance }),
        personas.create({ balance: 0 }),
      ]);
      expect((await sender.api.auth.currentUser()).balance, 'seeded sender balance').toBe(openingBalance);
      return { sender, recipient };
    });

    const app = await openSessionAs(sender);

    await test.step('ACT: UI reflects the seeded balance', async () => {
      await app.feed.open();
      await app.sideNav.expectBalance(openingBalance);
    });

    await test.step('ACT: transfer funds through the UI', async () => {
      await app.newTransaction.open();
      await app.newTransaction.pay({ recipient: recipient.user, amount, description });
    });

    const expectedSenderBalance = dollarsToCents(1_000 - amount);

    await test.step('ASSERT (UI): balance re-renders after the server refresh', async () => {
      await app.sideNav.expectBalance(expectedSenderBalance);
    });

    await test.step('ASSERT (API): business endpoints report the new balances', async () => {
      expect((await sender.api.auth.currentUser()).balance).toBe(expectedSenderBalance);
      expect((await recipient.api.auth.currentUser()).balance).toBe(dollarsToCents(amount));

      const transaction = await sender.api.transactions.findByDescription(description);
      expect(transaction, 'transaction visible in sender history').toMatchObject({
        senderId: sender.user.id,
        receiverId: recipient.user.id,
        amount: dollarsToCents(amount),
        status: 'complete',
      });
    });

    await test.step('ASSERT (DB): exactly one persisted record and conserved money', async () => {
      const persisted = await anonymousApi.testData.transactionsBetween(sender.user.id, recipient.user.id);
      expect(persisted, 'no duplicate submissions').toHaveLength(1);
      expect(persisted[0]).toMatchObject({ amount: dollarsToCents(amount), description, status: 'complete' });

      const [senderRow, recipientRow] = await Promise.all([
        anonymousApi.testData.userById(sender.user.id),
        anonymousApi.testData.userById(recipient.user.id),
      ]);
      expect(senderRow.balance + recipientRow.balance, 'money is conserved').toBe(openingBalance);
    });
  });
});
