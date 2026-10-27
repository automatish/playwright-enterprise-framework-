import type { BankAccount } from './bank-account.model';
import type { Credentials, User } from './user.model';

/**
 * A fully provisioned test actor: a real RWA user with credentials and a
 * linked bank account (which also suppresses RWA's first-run onboarding dialog).
 */
export interface Persona {
  readonly user: User;
  readonly credentials: Credentials;
  readonly bankAccount: BankAccount;
}
