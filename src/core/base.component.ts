import { expect, type Locator, type Page } from '@playwright/test';
import { step } from './step';

/**
 * A component is a self-contained region of the UI anchored to a root locator.
 * Every child locator is scoped to that root, so the same component class can
 * be reused on any page that renders it without selector collisions.
 */
export abstract class BaseComponent {
  protected readonly page: Page;

  constructor(
    readonly root: Locator,
    protected readonly name: string,
  ) {
    this.page = root.page();
  }

  /** Scoped `getByTestId` (RWA uses the `data-test` attribute, see playwright.config). */
  protected byTestId(testId: string | RegExp): Locator {
    return this.root.getByTestId(testId);
  }

  async expectVisible(): Promise<void> {
    await step(`${this.name} is visible`, async () => {
      await expect(this.root).toBeVisible();
    });
  }

  async expectHidden(): Promise<void> {
    await step(`${this.name} is hidden`, async () => {
      await expect(this.root).toBeHidden();
    });
  }
}
