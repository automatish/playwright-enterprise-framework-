import { expect, type Locator } from '@playwright/test';
import { BasePage } from '@core/base.page';
import { step } from '@core/step';
import type { Credentials } from '@test-data/models/user.model';

export class SignInPage extends BasePage {
  protected readonly path = '/signin';

  readonly heading = this.page.getByRole('heading', { name: 'Sign in' });
  readonly usernameInput = this.page.getByLabel('Username');
  readonly passwordInput = this.page.getByLabel('Password');
  readonly rememberMe = this.page.getByRole('checkbox', { name: 'Remember me' });
  readonly submitButton = this.page.getByRole('button', { name: 'Sign In' });
  readonly errorAlert = this.page.getByRole('alert');
  readonly signUpLink = this.page.getByRole('link', { name: /sign up/i });

  protected readyIndicator(): Locator {
    return this.heading;
  }

  async signIn({ username, password }: Credentials): Promise<void> {
    await step(`Sign in through the UI as ${username}`, async () => {
      await this.fill(this.usernameInput, username, 'username');
      await this.fill(this.passwordInput, password, 'password', { secret: true });
      await this.click(this.submitButton, 'Sign In');
    });
  }

  async expectError(message: string): Promise<void> {
    await step(`Sign-in error "${message}" is shown`, async () => {
      await expect(this.errorAlert).toHaveText(message);
    });
  }
}
