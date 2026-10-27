import path from 'node:path';
import os from 'node:os';
import { defineConfig, devices, type Project, type ReporterDescription } from '@playwright/test';
import { env, type BrowserName } from './env.config';

const ROOT = path.resolve(__dirname, '../..');
const fromRoot = (...segments: string[]): string => path.join(ROOT, ...segments);
const STORAGE_STATE = fromRoot('.auth', 'user.json');
const GITHUB_REPO = 'automatish/playwright-enterprise-framework-';

/**
 * Project matchers are anchored on `tests/<folder>/` and are regexes rather than globs: a glob such
 * as `e2e/**` would also match every spec when the checkout itself lives under a directory named
 * `e2e` (as it does in the Docker runner).
 */
const specsIn = (...folders: string[]): RegExp =>
  new RegExp(`tests[\\\\/](${folders.join('|')})[\\\\/].+\\.spec\\.ts$`);

const deviceFor: Record<BrowserName, (typeof devices)[string]> = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
};

/** One authenticated e2e project per requested engine (BROWSERS=chromium,firefox,webkit). */
const e2eProjects: Project[] = env.BROWSERS.map((browser) => ({
  name: `e2e-${browser}`,
  testMatch: specsIn('e2e', 'api-seed'),
  dependencies: ['setup'],
  use: { ...deviceFor[browser], storageState: STORAGE_STATE },
}));

const reporters: ReporterDescription[] = [
  // CI shards emit blob reports that a downstream job merges into one HTML report.
  env.CI
    ? ['blob', { outputDir: fromRoot('reports', 'blob') }]
    : ['html', { outputFolder: fromRoot('reports', 'html'), open: 'never' }],
  env.CI ? ['github'] : ['list', { printSteps: false }],
  [
    'allure-playwright',
    {
      resultsDir: fromRoot('reports', 'allure-results'),
      detail: true,
      suiteTitle: true,
      links: {
        issue: { nameTemplate: 'Issue #%s', urlTemplate: `https://github.com/${GITHUB_REPO}/issues/%s` },
        tms: { nameTemplate: 'TC-%s', urlTemplate: `https://github.com/${GITHUB_REPO}/wiki/Test-Cases#%s` },
      },
      categories: [
        { name: 'Known product defects', matchedStatuses: ['failed'], messageRegex: '.*KNOWN-DEFECT.*' },
        {
          name: 'Contract / API drift',
          matchedStatuses: ['failed', 'broken'],
          messageRegex: '.*(Contract violation|ApiError).*',
        },
        {
          name: 'Infrastructure: application unreachable',
          matchedStatuses: ['broken', 'failed'],
          messageRegex: '.*(ECONNREFUSED|net::ERR_CONNECTION_REFUSED).*',
        },
        {
          name: 'Visual regressions',
          matchedStatuses: ['failed'],
          messageRegex: '.*Screenshot comparison failed.*',
        },
      ],
      environmentInfo: {
        target: 'Cypress Real World App',
        base_url: env.BASE_URL,
        api_url: env.API_URL,
        browsers: env.BROWSERS.join(','),
        node: process.version,
        os: `${os.platform()} ${os.release()}`,
      },
    },
  ],
];

export default defineConfig({
  testDir: fromRoot('tests'),
  outputDir: fromRoot('test-results'),
  snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{projectName}/{testFileName}/{arg}{ext}',

  fullyParallel: true,
  forbidOnly: env.CI,
  // Retries surface flakiness (reported as "flaky") rather than hide it; zero locally for fast feedback.
  retries: env.CI ? 2 : 0,
  workers: env.CI ? 3 : '50%',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  reporter: reporters,

  use: {
    baseURL: env.BASE_URL,
    // RWA tags elements with `data-test`; this makes getByTestId() target it.
    testIdAttribute: 'data-test',
    locale: 'en-US',
    timezoneId: 'UTC',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Evidence only when it is needed: keeps green runs fast and artifacts small.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /tests[\\/]setup[\\/].+\.setup\.ts$/,
    },
    ...e2eProjects,
    {
      name: 'visual-chromium',
      testMatch: specsIn('visual'),
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
