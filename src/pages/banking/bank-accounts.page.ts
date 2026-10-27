import { expect, type Locator } from '@playwright/test';
import { BasePage } from '@core/base.page';
import { step } from '@core/step';
import type { NewBankAccount } from '@test-data/models/bank-account.model';

export class BankAccountsPage extends BasePage {
  protected readonly path = '/bankaccounts';

  readonly heading = this.page.getByRole('heading', { name: 'Bank Accounts' });
  readonly createButton = this.page.getByRole('link', { name: 'Create' });
  readonly list = this.page.getByTestId('bankaccount-list');
  readonly bankNameInput = this.page.getByPlaceholder('Bank Name');
  readonly routingNumberInput = this.page.getByPlaceholder('Routing Number');
  readonly accountNumberInput = this.page.getByPlaceholder('Account Number');
  readonly saveButton = this.page.getByRole('button', { name: 'Save' });

  protected readyIndicator(): Locator {
    return this.heading;
  }

  account(bankName: string): Locator {
    return this.list.getByRole('listitem').filter({ hasText: bankName });
  }

  async addAccount(account: NewBankAccount): Promise<void> {
    await step(`Link bank account "${account.bankName}"`, async () => {
      await this.click(this.createButton, 'Create');
      await this.fill(this.bankNameInput, account.bankName, 'bank name');
      await this.fill(this.routingNumberInput, account.routingNumber, 'routing number');
      await this.fill(this.accountNumberInput, account.accountNumber, 'account number');
      await this.click(this.saveButton, 'Save');
      await expect(this.account(account.bankName)).toBeVisible();
    });
  }

  async deleteAccount(bankName: string): Promise<void> {
    await step(`Delete bank account "${bankName}"`, async () => {
      await this.click(this.account(bankName).getByRole('button', { name: 'Delete' }), 'Delete');
      await expect(this.account(bankName)).toContainText('(Deleted)');
    });
  }
}
