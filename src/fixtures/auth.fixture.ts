import fs from 'node:fs/promises';
import path from 'node:path';
import type { BrowserContextOptions } from '@playwright/test';
import { ApiSession } from '@api/api-session';
import { env } from '@config/env.config';
import { BankAccountFactory } from '@test-data/factories/bank-account.factory';
import { UserFactory } from '@test-data/factories/user.factory';
import type { Persona } from '@test-data/models/persona.model';
import type { NewUser, User } from '@test-data/models/user.model';
import { childLogger } from '@utils/logger';

export type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

const log = childLogger('auth');

export const AUTH_DIR = path.resolve(__dirname, '../../.auth');
export const PRIMARY_STORAGE_STATE = path.join(AUTH_DIR, 'user.json');
const PRIMARY_PERSONA_FILE = path.join(AUTH_DIR, 'user.persona.json');

/**
 * RWA's SPA does not ask the server "who am I?" on boot. It restores a
 * serialized xstate auth-machine snapshot from `localStorage.authState`, and
 * only then sends API calls with the `connect.sid` cookie. A browser session is
 * therefore cookie (server truth) + snapshot (client truth).
 *
 * We obtain the cookie with a real API login and synthesise the snapshot from
 * the user returned by that same login, so no test ever pays for a UI login.
 */
const authMachineSnapshot = (user: User): string =>
  JSON.stringify({
    value: 'authorized',
    context: { user },
    historyValue: { current: 'authorized', states: {} },
    _event: { name: 'xstate.init', data: { type: 'xstate.init' }, $$type: 'scxml', type: 'external' },
    event: { type: 'xstate.init' },
    actions: [],
    activities: {},
    meta: {},
    events: [],
    children: {},
    done: false,
    changed: false,
    tags: [],
  });

/** Converts an authenticated API session into a Playwright browser storage state. */
export const toBrowserStorageState = async (session: ApiSession, user: User): Promise<StorageState> => {
  const { cookies } = await session.client.storageState();
  if (!cookies.some((cookie) => cookie.name === 'connect.sid')) {
    throw new Error(`API login for ${user.username} did not yield a session cookie`);
  }
  return {
    cookies,
    origins: [
      {
        origin: new URL(env.BASE_URL).origin,
        localStorage: [{ name: 'authState', value: authMachineSnapshot(user) }],
      },
    ],
  };
};

export interface ProvisionOptions {
  /** Opening pay-app balance in cents. */
  balance?: number;
  user?: Partial<NewUser>;
}

export interface ProvisionedPersona extends Persona {
  /** Signed-in API session belonging to this persona. Caller owns disposal. */
  readonly api: ApiSession;
  readonly storageState: StorageState;
}

/**
 * Creates a brand-new user purely through the API: sign-up -> login -> link a
 * bank account. Every test that mutates money gets its own persona, so tests
 * stay independent under full parallelism, sharding and retries.
 */
export const provisionPersona = async ({
  balance = 0,
  user,
}: ProvisionOptions = {}): Promise<ProvisionedPersona> => {
  const signUp = UserFactory.build({ balance, ...user });
  const credentials = { username: signUp.username, password: signUp.password };

  const anonymous = await ApiSession.anonymous();
  try {
    await anonymous.users.create(signUp);
  } finally {
    await anonymous.dispose();
  }

  const api = await ApiSession.signedIn(credentials);
  const bankAccount = await api.bankAccounts.create(BankAccountFactory.build());
  const freshUser = await api.auth.currentUser();
  log.info(
    { username: freshUser.username, id: freshUser.id, balance: freshUser.balance },
    'persona provisioned',
  );

  return {
    user: freshUser,
    credentials,
    bankAccount,
    api,
    storageState: await toBrowserStorageState(api, freshUser),
  };
};

/** Persists the primary persona produced by the setup project. */
export const savePrimaryPersona = async (persona: ProvisionedPersona): Promise<void> => {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const { user, credentials, bankAccount, storageState } = persona;
  await fs.writeFile(PRIMARY_STORAGE_STATE, JSON.stringify(storageState, null, 2));
  await fs.writeFile(
    PRIMARY_PERSONA_FILE,
    JSON.stringify({ user, credentials, bankAccount } satisfies Persona, null, 2),
  );
};

export const loadPrimaryPersona = async (): Promise<Persona> => {
  try {
    return JSON.parse(await fs.readFile(PRIMARY_PERSONA_FILE, 'utf8')) as Persona;
  } catch (error: unknown) {
    throw new Error(
      `Primary persona not found at ${PRIMARY_PERSONA_FILE}. Run through a project that depends on "setup".`,
      { cause: error },
    );
  }
};
