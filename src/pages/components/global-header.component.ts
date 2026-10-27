import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.component';
import { step } from '@core/step';

export type FeedTab = 'Everyone' | 'Friends' | 'Mine';

/** Top application bar: drawer toggle, "New" CTA, notifications bell and feed tabs. */
export class GlobalHeaderComponent extends BaseComponent {
  readonly newTransactionButton: Locator;
  readonly notificationsLink: Locator;
  readonly notificationsCount: Locator;
  readonly drawerToggle: Locator;

  constructor(page: Page) {
    super(page.getByRole('banner'), 'Global header');
    this.newTransactionButton = this.root.getByRole('link', { name: 'New' });
    this.notificationsLink = this.byTestId('nav-top-notifications-link');
    this.notificationsCount = this.byTestId('nav-top-notifications-count');
    this.drawerToggle = this.root.getByRole('button', { name: 'open drawer' });
  }

  tab(name: FeedTab): Locator {
    return this.root.getByRole('tab', { name });
  }

  async openTab(name: FeedTab): Promise<void> {
    await step(`Open "${name}" feed tab`, () => this.tab(name).click());
  }

  async startNewTransaction(): Promise<void> {
    await step('Start a new transaction', () => this.newTransactionButton.click());
  }
}
