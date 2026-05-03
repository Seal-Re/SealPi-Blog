import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  workers: 2,
  reporter: [['html', { outputFolder: 'results/html' }], ['json', { outputFile: 'results/results.json' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://blog.sealpi.cn',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
