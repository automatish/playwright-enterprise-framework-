import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '@core/base.component';
import { step } from '@core/step';

export type TransactionAction = 'paid' | 'requested' | 'charged';

/** Strongly-typed projection of one rendered feed row. */
export interface TransactionRow {
  id: string;
  sender: string;
  action: TransactionAction;
  receiver: string;
  description: string;
  /** Signed, formatted amount exactly as displayed, e.g. "-$25.00". */
  amount: string;
  likes: number;
  comments: number;
}

const ROW_PREFIX = 'transaction-item-';

/**
 * The transaction feed rendered on Everyone / Friends / Mine tabs.
 *
 * Encapsulates RWA's three mutually exclusive list states — skeleton (loading),
 * empty, and populated — plus row parsing so specs assert on domain values
 * instead of DOM structure.
 */
export class TransactionTableComponent extends BaseComponent {
  readonly rows: Locator;
  readonly skeleton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page.getByRole('main'), 'Transaction table');
    this.rows = this.byTestId(new RegExp(`^${ROW_PREFIX}`));
    this.skeleton = this.byTestId('list-skeleton');
    this.emptyState = this.byTestId('empty-list-header');
  }

  rowByDescription(description: string): Locator {
    return this.rows.filter({ hasText: description });
  }

  async parseRow(row: Locator): Promise<TransactionRow> {
    const testId = await row.getAttribute('data-test');
    if (!testId?.startsWith(ROW_PREFIX)) throw new Error(`Not a transaction row: ${String(testId)}`);
    const id = testId.slice(ROW_PREFIX.length);
    const text = async (selector: string): Promise<string> =>
      ((await row.getByTestId(selector).textContent()) ?? '').trim();

    return {
      id,
      sender: await text(`transaction-sender-${id}`),
      action: (await text(`transaction-action-${id}`)) as TransactionAction,
      receiver: await text(`transaction-receiver-${id}`),
      // The memo has no test id; it is the paragraph rendered directly after the title line.
      description: (
        (await row.locator(`p:has(> [data-test="transaction-sender-${id}"]) + p`).textContent()) ?? ''
      ).trim(),
      amount: await text(`transaction-amount-${id}`),
      likes: Number(await text('transaction-like-count')),
      comments: Number(await text('transaction-comment-count')),
    };
  }

  async findRow(description: string): Promise<TransactionRow> {
    const row = this.rowByDescription(description);
    await expect(row, `row "${description}" should be rendered exactly once`).toHaveCount(1);
    return this.parseRow(row);
  }

  async expectPopulated(): Promise<void> {
    await step('Transaction table is populated', async () => {
      await expect(this.rows.first()).toBeVisible();
      await expect(this.emptyState).toBeHidden();
    });
  }

  async expectEmptyState(): Promise<void> {
    await step('Transaction table shows the empty state', async () => {
      await expect(this.emptyState).toHaveText('No Transactions');
      await expect(this.rows).toHaveCount(0);
    });
  }

  async expectRow(expected: Omit<TransactionRow, 'id' | 'likes' | 'comments'>): Promise<TransactionRow> {
    return step(
      `Row "${expected.description}" shows ${expected.sender} ${expected.action} ${expected.receiver} ${expected.amount}`,
      async () => {
        const row = this.rowByDescription(expected.description);
        // Web-first assertions first (they retry), then a structural comparison of the parsed row.
        await expect(row).toBeVisible();
        await expect(row.getByTestId(/^transaction-amount-/)).toHaveText(expected.amount);
        const parsed = await this.findRow(expected.description);
        expect(parsed).toMatchObject(expected);
        return parsed;
      },
    );
  }
}
