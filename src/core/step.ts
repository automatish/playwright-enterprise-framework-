import { test } from '@playwright/test';

/**
 * Runs `body` as a named, boxed step.
 *
 * `test.step` is the single source of truth for step reporting: allure-playwright
 * maps it to an Allure step, the HTML report and trace viewer render it as a
 * collapsible node, and `box: true` points failures at the calling test line
 * rather than at framework internals.
 */
export const step = <T>(title: string, body: () => Promise<T>): Promise<T> =>
  test.step(title, body, { box: true });
