import * as allure from 'allure-js-commons';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface TestMetadata {
  epic: string;
  feature: string;
  story?: string;
  severity: Severity;
  owner?: string;
  /** Issue key resolved through the `issue` link template in playwright.config. */
  issue?: string;
  /** Test-case id resolved through the `tms` link template. */
  tms?: string;
}

/**
 * Applies Allure BDD hierarchy, severity and traceability links in one call
 * so every spec carries consistent, filterable metadata.
 */
export const describeTest = async (meta: TestMetadata): Promise<void> => {
  await allure.epic(meta.epic);
  await allure.feature(meta.feature);
  if (meta.story) await allure.story(meta.story);
  await allure.severity(meta.severity);
  await allure.owner(meta.owner ?? 'qa-platform');
  if (meta.issue) await allure.issue(meta.issue);
  if (meta.tms) await allure.tms(meta.tms);
};
