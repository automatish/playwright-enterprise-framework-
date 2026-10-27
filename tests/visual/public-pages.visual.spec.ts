import { test, expect } from '@fixtures/test.fixture';
import { describeTest } from '@utils/allure-meta';

/**
 * Pixel-level regression checks. Baselines are generated inside the pinned
 * Playwright Docker image (`npm run test:visual:update`) so font rendering is
 * identical locally and on CI.
 */
test.describe('Visual regression', { tag: ['@visual'] }, () => {
  test.beforeEach(async () => {
    await describeTest({ epic: 'User experience', feature: 'Visual consistency', severity: 'minor' });
  });

  test.describe('anonymous pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('sign-in page', async ({ app }) => {
      await app.signIn.open();
      await expect(app.page).toHaveScreenshot('sign-in.png', { fullPage: true });
    });

    test('sign-in validation state', async ({ app }) => {
      await app.signIn.open();
      await app.signIn.usernameInput.focus();
      await app.signIn.usernameInput.blur();
      await expect(app.page.getByText('Username is required')).toBeVisible();
      await expect(app.page.getByRole('main')).toHaveScreenshot('sign-in-validation.png');
    });
  });

  test('bank accounts page for a fresh user', async ({ personas, openSessionAs }) => {
    // A fresh persona with a fixed balance keeps the dynamic sidebar deterministic; names are masked.
    const persona = await personas.create({ balance: 12_345 });
    const app = await openSessionAs(persona);
    await app.bankAccounts.open();
    await expect(app.page).toHaveScreenshot('bank-accounts.png', {
      mask: [app.sideNav.fullName, app.sideNav.username, app.bankAccounts.list],
    });
  });
});
