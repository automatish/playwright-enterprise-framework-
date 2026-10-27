import { test, expect } from '@fixtures/test.fixture';
import { TransactionFactory } from '@test-data/factories/transaction.factory';
import { describeTest } from '@utils/allure-meta';
import { dollarsToCents } from '@utils/money';
import * as allure from 'allure-js-commons';
import type { ProvisionedPersona } from '@fixtures/auth.fixture';
import type { PersonaFactory, SessionLauncher } from '@fixtures/test.fixture';
import type { BankingApp } from '@pages/banking-app';
import {
  NetworkInterceptor,
  NetworkProfiles,
  type ApiRouteMatcher,
  type Fault,
} from '@utils/network-interceptor';

const RWA_OPTIMISTIC_TOAST_SOURCE =
  'https://github.com/cypress-io/cypress-realworld-app/blob/0729f68ac220f7cda4ad09c5693dba11d7c532c6/src/components/TransactionCreateStepTwo.tsx#L116-L127';

const PUBLIC_FEED: ApiRouteMatcher = { method: 'GET', path: '/transactions/public' };
const CREATE_TRANSACTION: ApiRouteMatcher = { method: 'POST', path: '/transactions' };

const FEED_FAULTS: Array<{ label: string; fault: Fault }> = [
  { label: 'HTTP 500 Internal Server Error', fault: { status: 500 } },
  { label: 'HTTP 503 Service Unavailable', fault: { status: 503, body: { error: 'Maintenance' } } },
  { label: 'request timeout', fault: { abort: 'timedout' } },
  { label: 'network outage (offline)', fault: { abort: 'internetdisconnected' } },
];

test.describe('Resilience: network faults and recovery', { tag: ['@resilience', '@network'] }, () => {
  test.beforeEach(async () => {
    await describeTest({
      epic: 'Platform reliability',
      feature: 'Network fault tolerance',
      severity: 'critical',
    });
  });

  for (const { label, fault } of FEED_FAULTS) {
    test(`transaction feed degrades gracefully on ${label} and recovers once the network is restored`, async ({
      app,
      network,
    }) => {
      await test.step(`Inject ${label} on ${PUBLIC_FEED.method} ${PUBLIC_FEED.path}`, async () => {
        await network.inject(PUBLIC_FEED, fault);
      });

      await test.step('App shell stays usable and the feed shows a safe empty state (no crash, no stale data)', async () => {
        await app.feed.open();
        await app.sideNav.expectVisible();
        await expect(app.sideNav.balance).toBeVisible();
        await app.feed.table.expectEmptyState();
        await expect(app.header.newTransactionButton).toBeEnabled();
      });

      await test.step('Network restored: user-driven retry (tab switch) recovers the feed', async () => {
        await network.restore();
        await app.header.openTab('Mine');
        await app.header.openTab('Everyone');
        await app.feed.table.expectPopulated();
      });
    });
  }

  test('loading skeleton is shown during a latency spike and replaced by data', async ({ app, network }) => {
    await network.delay(PUBLIC_FEED, 3_000);
    await app.feed.open();
    await expect(app.feed.table.skeleton, 'skeleton communicates loading state').toBeVisible();
    await app.feed.table.expectPopulated();
    await expect(app.feed.table.skeleton).toBeHidden();
  });

  test('dashboard remains functional on a throttled "Slow 3G" connection', async ({
    app,
    network,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Bandwidth throttling relies on the Chrome DevTools Protocol');
    test.slow();
    await app.feed.open();
    await network.throttle(NetworkProfiles.slow3G);
    await app.header.openTab('Mine');
    await app.header.openTab('Everyone');
    await app.feed.table.expectPopulated();
    await app.sideNav.expectVisible();
  });

  test.describe('payment submitted during an outage', () => {
    const OPENING_BALANCE = dollarsToCents(300);
    const AMOUNT = 50;

    /** Funded sender on the payment form with the transaction endpoint offline, ready to click "Pay". */
    const armOutage = async (
      personas: PersonaFactory,
      openSessionAs: SessionLauncher,
    ): Promise<{
      app: BankingApp;
      sender: ProvisionedPersona;
      recipient: ProvisionedPersona;
      network: NetworkInterceptor;
      description: string;
    }> => {
      const [sender, recipient] = await Promise.all([
        personas.create({ balance: OPENING_BALANCE }),
        personas.create(),
      ]);
      const app = await openSessionAs(sender);
      const network = new NetworkInterceptor(app.page);
      const description = TransactionFactory.description('Outage');

      await app.newTransaction.open();
      await app.newTransaction.selectRecipient(recipient.user);
      await app.newTransaction.enterDetails(AMOUNT, description);
      await network.abort(CREATE_TRANSACTION, 'internetdisconnected');
      return { app, sender, recipient, network, description };
    };

    const submitAndAwaitFailure = async (app: BankingApp): Promise<void> => {
      const failed = app.page.waitForEvent(
        'requestfailed',
        (request) =>
          request.method() === 'POST' && new URL(request.url()).pathname === CREATE_TRANSACTION.path,
      );
      await app.newTransaction.payButton.click();
      await failed;
    };

    test('no money moves and the UI balance stays truthful after reconnecting', async ({
      personas,
      openSessionAs,
      anonymousApi,
    }) => {
      const { app, sender, recipient, network } = await armOutage(personas, openSessionAs);

      await test.step('Submit the payment while offline', () => submitAndAwaitFailure(app));

      await test.step('Server state is untouched: no record, no debit, no credit', async () => {
        expect(
          await anonymousApi.testData.transactionsBetween(sender.user.id, recipient.user.id),
        ).toHaveLength(0);
        expect((await sender.api.auth.currentUser()).balance).toBe(OPENING_BALANCE);
        expect((await recipient.api.auth.currentUser()).balance).toBe(0);
      });

      await test.step('After reconnecting, the dashboard shows the unchanged balance', async () => {
        await network.restore();
        await app.feed.open();
        await app.sideNav.expectBalance(OPENING_BALANCE);
      });
    });

    test('user is told the payment failed', async ({ personas, openSessionAs }) => {
      test.fail(
        true,
        'KNOWN-DEFECT: RWA fires an optimistic "Transaction Submitted!" success toast before POST /transactions resolves and never reports the failure.',
      );
      await allure.link(RWA_OPTIMISTIC_TOAST_SOURCE, 'Upstream source: optimistic success toast');

      const { app } = await armOutage(personas, openSessionAs);
      await submitAndAwaitFailure(app);
      await app.toast.expectMessage('error', /fail|error|try again/i);
    });
  });
});
