import { expect, type Locator } from '@playwright/test';
import { BasePage } from '@core/base.page';
import { step } from '@core/step';
import type { TransactionType } from '@test-data/models/transaction.model';
import type { User } from '@test-data/models/user.model';
import { dollarsToCents, formatCents } from '@utils/money';

export interface TransferDetails {
  recipient: Pick<User, 'id' | 'username' | 'firstName' | 'lastName'>;
  /** Whole dollars. RWA's API truncates fractional amounts. */
  amount: number;
  description: string;
}

/** Three-step wizard: pick contact -> amount & memo -> confirmation. */
export class NewTransactionPage extends BasePage {
  protected readonly path = '/transaction/new';

  // Step 1 - select recipient
  readonly searchInput = this.page.getByPlaceholder('Search...');
  readonly contacts = this.page.getByTestId('users-list').getByRole('listitem');
  // Step 2 - amount & memo
  readonly amountInput = this.page.getByPlaceholder('Amount');
  readonly descriptionInput = this.page.getByPlaceholder('Add a note');
  readonly payButton = this.page.getByRole('button', { name: 'Pay' });
  readonly requestButton = this.page.getByRole('button', { name: 'Request' });
  // Step 3 - confirmation
  readonly returnToTransactions = this.page.getByRole('link', { name: 'Return To Transactions' });
  readonly createAnother = this.page.getByRole('button', { name: 'Create Another Transaction' });

  protected readyIndicator(): Locator {
    return this.searchInput;
  }

  recipientOption(userId: string): Locator {
    return this.page.getByTestId(`user-list-item-${userId}`);
  }

  confirmation(type: TransactionType, amount: number, description: string): Locator {
    const verb = type === 'payment' ? 'Paid' : 'Requested';
    return this.page.getByRole('heading', {
      name: `${verb} ${formatCents(dollarsToCents(amount))} for ${description}`,
    });
  }

  async selectRecipient(recipient: TransferDetails['recipient']): Promise<void> {
    await step(`Select recipient @${recipient.username}`, async () => {
      // RWA's users state machine ignores a search issued while the initial GET /users is still
      // in flight (it has no FETCH transition in its "loading" state), so wait for that first.
      await expect(this.contacts.first()).toBeVisible();
      await this.waitForApi('GET', '/users/search', () =>
        this.fill(this.searchInput, recipient.username, 'contact search'),
      );
      await this.click(
        this.recipientOption(recipient.id),
        `contact ${recipient.firstName} ${recipient.lastName}`,
      );
      await expect(
        this.page.getByRole('heading', { name: `${recipient.firstName} ${recipient.lastName}` }),
      ).toBeVisible();
    });
  }

  async enterDetails(amount: number, description: string): Promise<void> {
    await step(`Enter amount $${amount} and memo`, async () => {
      await this.fill(this.amountInput, String(amount), 'amount');
      await this.fill(this.descriptionInput, description, 'memo');
    });
  }

  /** Full payment journey; resolves once the backend has accepted the transaction. */
  async pay({ recipient, amount, description }: TransferDetails): Promise<void> {
    await step(`Pay $${amount} to @${recipient.username}`, async () => {
      await this.selectRecipient(recipient);
      await this.enterDetails(amount, description);
      const response = await this.waitForApi('POST', '/transactions', () =>
        this.click(this.payButton, 'Pay'),
      );
      expect(response.status(), 'POST /transactions status').toBe(200);
      await expect(this.confirmation('payment', amount, description)).toBeVisible();
    });
  }
}
