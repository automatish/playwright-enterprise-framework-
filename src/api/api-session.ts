import { ApiClient } from '@core/api.client';
import type { Credentials } from '@test-data/models/user.model';
import { AuthApi } from './auth.api';
import { BankAccountsApi } from './bank-accounts.api';
import { TestDataApi } from './test-data.api';
import { TransactionsApi } from './transactions.api';
import { UsersApi } from './users.api';

/**
 * One isolated backend session (own cookie jar) exposing every domain API.
 * Tests talk to the backend exclusively through this facade.
 */
export class ApiSession {
  readonly auth: AuthApi;
  readonly users: UsersApi;
  readonly bankAccounts: BankAccountsApi;
  readonly transactions: TransactionsApi;
  readonly testData: TestDataApi;

  private constructor(readonly client: ApiClient) {
    this.auth = new AuthApi(client);
    this.users = new UsersApi(client);
    this.bankAccounts = new BankAccountsApi(client);
    this.transactions = new TransactionsApi(client);
    this.testData = new TestDataApi(client);
  }

  static async anonymous(label = 'anonymous'): Promise<ApiSession> {
    return new ApiSession(await ApiClient.create(label));
  }

  static async signedIn(credentials: Credentials): Promise<ApiSession> {
    const session = await ApiSession.anonymous(credentials.username);
    await session.auth.login(credentials);
    return session;
  }

  dispose(): Promise<void> {
    return this.client.dispose();
  }
}
