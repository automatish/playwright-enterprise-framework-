import type { ApiClient } from '@core/api.client';
import { UserEnvelopeSchema, type Credentials, type User } from '@test-data/models/user.model';

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  /** Passport local login. On success the client's cookie jar holds `connect.sid`. */
  async login({ username, password }: Credentials): Promise<User> {
    const { user } = await this.client.post('/login', {
      data: { type: 'LOGIN', username, password },
      schema: UserEnvelopeSchema,
    });
    return user;
  }

  /** Returns the user bound to the current session; the authoritative source of the live balance. */
  async currentUser(): Promise<User> {
    const { user } = await this.client.get('/checkAuth', { schema: UserEnvelopeSchema });
    return user;
  }

  async expectUnauthenticated(): Promise<void> {
    await this.client.get('/checkAuth', { expectStatus: 401 });
  }
}
