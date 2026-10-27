import type { ApiClient } from '@core/api.client';
import { z } from 'zod';
import { TransactionSchema } from '@test-data/models/transaction.model';
import { UserSchema } from '@test-data/models/user.model';

const entitySchemas = {
  users: UserSchema,
  transactions: TransactionSchema,
} as const;

type Entity = keyof typeof entitySchemas;
type EntityRecord<E extends Entity> = z.infer<(typeof entitySchemas)[E]>;

/**
 * Database probe over RWA's test-only `/testData` router (enabled when the API
 * runs with NODE_ENV=test|development). It reads the lowdb tables directly,
 * which makes it the independent oracle for "what is actually persisted",
 * as opposed to what a business endpoint chooses to return.
 */
export class TestDataApi {
  constructor(private readonly client: ApiClient) {}

  /** Restores the database to the canonical seed. Only safe before any worker starts. */
  async reseed(): Promise<void> {
    await this.client.post('/testData/seed');
  }

  async all<E extends Entity>(entity: E): Promise<EntityRecord<E>[]> {
    const { results } = await this.client.get(`/testData/${entity}`, {
      schema: z.object({ results: z.array(entitySchemas[entity]) }),
    });
    return results;
  }

  async userById(id: string): Promise<z.infer<typeof UserSchema>> {
    const user = (await this.all('users')).find((candidate) => candidate.id === id);
    if (!user) throw new Error(`User ${id} not found in database`);
    return user;
  }

  async transactionsBetween(
    senderId: string,
    receiverId: string,
  ): Promise<z.infer<typeof TransactionSchema>[]> {
    return (await this.all('transactions')).filter(
      (transaction) => transaction.senderId === senderId && transaction.receiverId === receiverId,
    );
  }
}
