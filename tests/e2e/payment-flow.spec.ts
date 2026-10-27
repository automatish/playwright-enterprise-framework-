import { test, expect } from '@fixtures/test.fixture';
import { TransactionFactory } from '@test-data/factories/transaction.factory';
import { describeTest } from '@utils/allure-meta';
import { dollarsToCents, formatCents } from '@utils/money';

/**
 * Authenticated UI transaction flow.
 * The browser starts already signed in via `.auth/user.json` (project storageState);
 * the only setup is an API-provisioned recipient.
 */
test.describe('Payments: authenticated UI flow', { tag: ['@smoke', '@payments'] }, () => {
  test.beforeEach(async () => {
    await describeTest({
      epic: 'Payments',
      feature: 'Send money',
      story: 'Signed-in user pays a contact from the UI',
      severity: 'blocker',
      tms: 'PAY-001',
    });
  });

  test('user pays a contact and the payment appears in their personal feed', async ({
    app,
    primaryPersona,
    personas,
  }) => {
    const recipient = await personas.create();
    const amount = 25;
    const description = TransactionFactory.description('Dinner split');
    const sender = primaryPersona.user;

    await test.step('Open the dashboard with the cached session (no UI login)', async () => {
      await app.feed.open();
      await app.sideNav.expectSignedInAs(sender.username);
    });

    await test.step('Send the payment through the 3-step wizard', async () => {
      await app.header.startNewTransaction();
      await app.newTransaction.waitUntilReady();
      await app.newTransaction.pay({ recipient: recipient.user, amount, description });
      await app.toast.expectMessage('success', 'Transaction Submitted!');
    });

    await test.step('Payment is listed in the "Mine" feed with the correct details', async () => {
      await app.newTransaction.returnToTransactions.click();
      await app.header.openTab('Mine');
      await app.feed.table.expectRow({
        sender: `${sender.firstName} ${sender.lastName}`,
        action: 'paid',
        receiver: `${recipient.user.firstName} ${recipient.user.lastName}`,
        description,
        amount: `-${formatCents(dollarsToCents(amount))}`,
      });
    });

    await test.step("Recipient was credited (verified through the recipient's own API session)", async () => {
      const { balance } = await recipient.api.auth.currentUser();
      expect(balance).toBe(dollarsToCents(amount));
    });
  });
});
