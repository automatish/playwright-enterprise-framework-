import { test as setup, expect } from '@playwright/test';
import { ApiSession } from '@api/api-session';
import { env } from '@config/env.config';
import { PRIMARY_STORAGE_STATE, provisionPersona, savePrimaryPersona } from '@fixtures/auth.fixture';
import { dollarsToCents, formatCents } from '@utils/money';
import { logger } from '@utils/logger';

/** Restores RWA's canonical seed so every run starts from the same baseline (opt-out via RESET_DB_ON_START). */
const reseedDatabase = async (): Promise<void> => {
  if (!env.RESET_DB_ON_START) {
    logger.info('RESET_DB_ON_START=false, keeping existing data');
    return;
  }
  const anonymous = await ApiSession.anonymous();
  await anonymous.testData.reseed();
  await anonymous.dispose();
};

/**
 * Runs once before every dependent project:
 *  1. (optional) re-seeds RWA for a deterministic baseline,
 *  2. provisions the primary persona entirely through the API,
 *  3. converts its API session into `.auth/user.json` — no UI login involved,
 *  4. proves the stored session is accepted by the real front-end.
 */
setup('provision primary persona and persist authenticated storage state', async ({ browser }) => {
  await setup.step('Re-seed RWA database', reseedDatabase);

  const persona = await setup.step('Provision primary persona via API', () =>
    provisionPersona({ balance: dollarsToCents(5_000) }),
  );

  await setup.step('Persist storage state', () => savePrimaryPersona(persona));

  await setup.step('Smoke-check the stored session in a real browser', async () => {
    const context = await browser.newContext({ baseURL: env.BASE_URL, storageState: PRIMARY_STORAGE_STATE });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByTestId('sidenav-username')).toHaveText(`@${persona.user.username}`);
    await expect(page.getByTestId('sidenav-user-balance')).toHaveText(formatCents(dollarsToCents(5_000)));
    await context.close();
  });

  await persona.api.dispose();
  logger.info({ username: persona.user.username }, 'primary persona ready');
});
