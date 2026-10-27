import { faker } from '@faker-js/faker';
import { env } from '@config/env.config';
import type { NewUser } from '@test-data/models/user.model';
import { uniqueSuffix } from './unique';

export const UserFactory = {
  /** Builds a valid sign-up payload. Any field can be overridden for edge cases. */
  build(overrides: Partial<NewUser> = {}): NewUser {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = `${firstName}${lastName}`.replace(/[^a-z]/gi, '').slice(0, 12) + uniqueSuffix();
    return {
      firstName,
      lastName,
      username,
      password: env.TEST_USER_PASSWORD,
      email: faker.internet.email({ firstName, lastName, provider: 'e2e.example.com' }).toLowerCase(),
      phoneNumber: faker.string.numeric(10),
      defaultPrivacyLevel: 'public',
      ...overrides,
    };
  },
} as const;
