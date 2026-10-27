import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '@core/base.component';
import { step } from '@core/step';
import { formatCents, type Cents } from '@utils/money';

export type SideNavLink = 'Home' | 'My Account' | 'Bank Accounts' | 'Notifications';

/** Persistent left drawer: identity, live balance and primary navigation. */
export class SideNavComponent extends BaseComponent {
  readonly fullName: Locator;
  readonly username: Locator;
  readonly balance: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page.getByTestId('sidenav'), 'Side navigation');
    this.fullName = this.byTestId('sidenav-user-full-name');
    this.username = this.byTestId('sidenav-username');
    this.balance = this.byTestId('sidenav-user-balance');
    this.logoutButton = this.byTestId('sidenav-signout');
  }

  link(name: SideNavLink): Locator {
    return this.root.getByRole('link', { name, exact: true });
  }

  async navigateTo(name: SideNavLink): Promise<void> {
    await step(`Navigate via side nav to "${name}"`, () => this.link(name).click());
  }

  async expectSignedInAs(username: string): Promise<void> {
    await step(`Side nav shows @${username}`, async () => {
      await expect(this.username).toHaveText(`@${username}`);
    });
  }

  /** Web-first assertion: retries until the balance re-renders after a server refresh. */
  async expectBalance(amount: Cents): Promise<void> {
    await step(`Side nav balance is ${formatCents(amount)}`, async () => {
      await expect(this.balance).toHaveText(formatCents(amount));
    });
  }
}
