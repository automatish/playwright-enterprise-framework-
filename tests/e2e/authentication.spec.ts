import { test, expect } from '@fixtures/test.fixture';
import { describeTest } from '@utils/allure-meta';

/** The only specs that exercise the login form; everything else reuses cached sessions. */
test.describe('Authentication', { tag: ['@auth', '@smoke'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    await describeTest({ epic: 'Identity', feature: 'Sign in', severity: 'blocker', tms: 'AUTH-001' });
  });

  test('protected routes redirect anonymous users to sign-in', async ({ app }) => {
    await app.page.goto('/bankaccounts');
    await app.signIn.expectUrl('/signin');
    await app.signIn.waitUntilReady();
  });

  test('user signs in with valid credentials and lands on the dashboard', async ({ app, personas }) => {
    const { credentials, user } = await personas.create();
    await app.signIn.open();
    await app.signIn.signIn(credentials);
    await app.feed.waitUntilReady();
    await app.sideNav.expectSignedInAs(user.username);
    await app.feed.expectUrl('/');
  });

  test('invalid password is rejected with a clear message and no session', async ({
    app,
    personas,
    anonymousApi,
  }) => {
    const { credentials } = await personas.create();
    await app.signIn.open();
    await app.signIn.signIn({ ...credentials, password: `${credentials.password}-wrong` });
    await app.signIn.expectError('Username or password is invalid');
    await app.signIn.expectUrl('/signin');
    await anonymousApi.auth.expectUnauthenticated();
    await expect(app.sideNav.root).toBeHidden();
  });
});
