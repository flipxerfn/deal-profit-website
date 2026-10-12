import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end verification against PRODUCTION.
 *
 * This is deliberately not a unit-test concern. The bug it exists to guard is
 * that every client-side route change rendered a BLANK page — content mounted,
 * laid out, at opacity 0, with no error and no failed request. Nothing but a
 * real browser doing real navigation could have caught that, and nothing but a
 * real deployed build would catch a regression that only exists after the
 * build pipeline runs.
 *
 * So it runs against https://goosiev.com and not against a dev server. A dev
 * server would not exercise the deployed asset pipeline, and the point is to
 * verify what a reader actually gets.
 */
export default defineConfig({
  testDir: './playwright',
  // Production is slow and flaky in a way that would make retries look like
  // real failures. Two attempts, no parallelism.
  retries: 2,
  workers: 1,
  timeout: 45_000,
  reporter: [['list']],
  outputDir: './playwright/.artifacts',
  use: {
    baseURL: 'https://goosiev.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});