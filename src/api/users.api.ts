import type { ApiClient } from '@core/api.client';
import { UserEnvelopeSchema, UserListSchema, type NewUser, type User } from '@test-data/models/user.model';

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  /** Public sign-up endpoint; does not require a session. */
  async create(payload: NewUser): Promise<User> {
    const { user } = await this.client.post('/users', {
      data: { ...payload, confirmPassword: payload.password },
      expectStatus: 201,
      schema: UserEnvelopeSchema,
    });
    return user;
  }

  async search(query: string): Promise<User[]> {
    const { results } = await this.client.get('/users/search', {
      params: { q: query },
      schema: UserListSchema,
    });
    return results;
  }
}
