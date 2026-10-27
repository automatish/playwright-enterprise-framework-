import { expect, type Page } from '@playwright/test';
import { BaseComponent } from '@core/base.component';
import { step } from '@core/step';

export type Severity = 'success' | 'info' | 'warning' | 'error';

/** Global snackbar / toast rendered by RWA's snackbar state machine. */
export class AlertBarComponent extends BaseComponent {
  constructor(page: Page) {
    super(page.getByTestId(/^alert-bar-/), 'Alert bar');
  }

  async expectMessage(severity: Severity, message: string | RegExp): Promise<void> {
    await step(`Toast [${severity}] "${String(message)}"`, async () => {
      await expect(this.root).toHaveAttribute('data-test', `alert-bar-${severity}`);
      await expect(this.root).toContainText(message);
    });
  }
}
