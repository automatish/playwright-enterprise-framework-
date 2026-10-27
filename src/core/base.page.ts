import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { childLogger, type Logger } from '@utils/logger';
import { step } from './step';

/**
 * Base for every page object.
 *
 * Wraps the handful of Playwright interactions the framework needs in named
 * steps (for Allure / HTML report / trace readability) and structured logs.
 * It deliberately does NOT re-implement waiting: Playwright's auto-waiting and
 * web-first assertions are the anti-flake mechanism, so there are no sleeps,
 * no `networkidle` and no `force: true` anywhere in the framework.
 */
export abstract class BasePage {
  protected readonly log: Logger;

  /** Application-relative path, resolved against `baseURL`. */
  protected abstract readonly path: string;

  constructor(protected readonly page: Page) {
    this.log = childLogger('page').child({ page: this.constructor.name });
  }

  /** Locator proving the page has rendered and is ready for interaction. */
  protected abstract readyIndicator(): Locator;

  async open(): Promise<this> {
    await step(`Open ${this.constructor.name} (${this.path})`, async () => {
      this.log.info({ path: this.path }, 'navigate');
      await this.page.goto(this.path);
      await this.waitUntilReady();
    });
    return this;
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.readyIndicator(), `${this.constructor.name} should be ready`).toBeVisible();
  }

  async expectUrl(pathname: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(
      typeof pathname === 'string' ? new RegExp(`${escapeRegExp(pathname)}$`) : pathname,
    );
  }

  protected async click(target: Locator, description: string): Promise<void> {
    await step(`Click ${description}`, async () => {
      this.log.debug({ target: description }, 'click');
      await target.click();
    });
  }

  protected async fill(
    target: Locator,
    value: string,
    description: string,
    opts = { secret: false },
  ): Promise<void> {
    await step(`Fill ${description}${opts.secret ? '' : ` with "${value}"`}`, async () => {
      this.log.debug({ target: description, value: opts.secret ? '***' : value }, 'fill');
      await target.fill(value);
    });
  }

  /** Performs `action` and resolves with the matching backend response, avoiding race conditions. */
  protected async waitForApi(
    method: string,
    pathname: string | RegExp,
    action: () => Promise<void>,
  ): Promise<Response> {
    const matches = (url: string): boolean => {
      const { pathname: actual } = new URL(url);
      return typeof pathname === 'string' ? actual === pathname : pathname.test(actual);
    };
    const [response] = await Promise.all([
      this.page.waitForResponse((res) => res.request().method() === method && matches(res.url())),
      action(),
    ]);
    return response;
  }
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
