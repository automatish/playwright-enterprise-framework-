import { test as base, expect } from '@playwright/test';
import { ApiSession } from '@api/api-session';
import { env } from '@config/env.config';
import { BankingApp } from '@pages/banking-app';
import type { Persona } from '@test-data/models/persona.model';
import { NetworkInterceptor } from '@utils/network-interceptor';
import {
  loadPrimaryPersona,
  provisionPersona,
  type ProvisionOptions,
  type ProvisionedPersona,
} from './auth.fixture';

export interface PersonaFactory {
  /** Provisions a fresh, isolated user via the API. Sessions are disposed automatically. */
  create(options?: ProvisionOptions): Promise<ProvisionedPersona>;
}

/** Opens a new, isolated browser context already authenticated as `persona`. */
export type SessionLauncher = (persona: ProvisionedPersona) => Promise<BankingApp>;

interface TestFixtures {
  /** Page objects bound to the default `page` (authenticated via the project's storageState). */
  app: BankingApp;
  /** Signed-in API session for the storageState user, for arrange/verify steps. */
  api: ApiSession;
  /** Unauthenticated API session (public endpoints + /testData DB probe). */
  anonymousApi: ApiSession;
  personas: PersonaFactory;
  openSessionAs: SessionLauncher;
  network: NetworkInterceptor;
  /** Fails the test on any uncaught exception in the page: a crash is never "graceful". */
  pageErrors: Error[];
}

interface WorkerFixtures {
  /** The persona the setup project authenticated into `.auth/user.json`. */
  primaryPersona: Persona;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  primaryPersona: [
    async ({}, use) => {
      await use(await loadPrimaryPersona());
    },
    { scope: 'worker' },
  ],

  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      await use(errors);
      expect(errors, 'uncaught exceptions in the page').toEqual([]);
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    await use(new BankingApp(page));
  },

  api: async ({ primaryPersona }, use) => {
    const session = await ApiSession.signedIn(primaryPersona.credentials);
    await use(session);
    await session.dispose();
  },

  anonymousApi: async ({}, use) => {
    const session = await ApiSession.anonymous();
    await use(session);
    await session.dispose();
  },

  personas: async ({}, use) => {
    const created: ProvisionedPersona[] = [];
    await use({
      create: async (options) => {
        const persona = await base.step(`Provision persona via API (balance ${options?.balance ?? 0}¢)`, () =>
          provisionPersona(options),
        );
        created.push(persona);
        return persona;
      },
    });
    await Promise.all(created.map((persona) => persona.api.dispose()));
  },

  openSessionAs: async ({ browser, viewport, locale, timezoneId }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (persona) => {
      const context = await browser.newContext({
        baseURL: env.BASE_URL,
        storageState: persona.storageState,
        viewport,
        ...(locale ? { locale } : {}),
        ...(timezoneId ? { timezoneId } : {}),
      });
      contexts.push(context);
      const page = await context.newPage();
      return new BankingApp(page);
    });
    await Promise.all(contexts.map((context) => context.close()));
  },

  network: async ({ page }, use) => {
    const interceptor = new NetworkInterceptor(page);
    await use(interceptor);
    await interceptor.restore();
  },
});

export { expect };
