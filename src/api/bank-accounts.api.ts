import type { ApiClient } from '@core/api.client';
import {
  BankAccountEnvelopeSchema,
  BankAccountListSchema,
  type BankAccount,
  type NewBankAccount,
} from '@test-data/models/bank-account.model';

export class BankAccountsApi {
  constructor(private readonly client: ApiClient) {}

  async create(payload: NewBankAccount): Promise<BankAccount> {
    const { account } = await this.client.post('/bankAccounts', {
      data: payload,
      schema: BankAccountEnvelopeSchema,
    });
    return account;
  }

  async list(): Promise<BankAccount[]> {
    const { results } = await this.client.get('/bankAccounts', { schema: BankAccountListSchema });
    return results;
  }
}
