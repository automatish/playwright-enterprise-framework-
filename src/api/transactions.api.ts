import type { ApiClient } from '@core/api.client';
import {
  TransactionEnvelopeSchema,
  TransactionFeedItemSchema,
  TransactionPageSchema,
  type NewTransaction,
  type Transaction,
  type TransactionFeedItem,
} from '@test-data/models/transaction.model';
import { z } from 'zod';

const FeedItemEnvelopeSchema = z.object({ transaction: TransactionFeedItemSchema });

export class TransactionsApi {
  constructor(private readonly client: ApiClient) {}

  async create(payload: NewTransaction): Promise<Transaction> {
    const { transaction } = await this.client.post('/transactions', {
      data: payload,
      schema: TransactionEnvelopeSchema,
    });
    return transaction;
  }

  async getById(id: string): Promise<TransactionFeedItem> {
    const { transaction } = await this.client.get(`/transactions/${id}`, { schema: FeedItemEnvelopeSchema });
    return transaction;
  }

  /** Transactions where the session user is sender or receiver ("Mine" tab). */
  async listPersonal(limit = 50): Promise<TransactionFeedItem[]> {
    const { results } = await this.client.get('/transactions', {
      params: { page: 1, limit },
      schema: TransactionPageSchema,
    });
    return results;
  }

  async findByDescription(description: string): Promise<TransactionFeedItem | undefined> {
    const personal = await this.listPersonal();
    return personal.find((transaction) => transaction.description === description);
  }
}
