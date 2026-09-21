import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const systemChrome = process.platform === 'win32' ? windowsChrome : macChrome;
const useSystemChrome = ['win32', 'darwin'].includes(process.platform) && existsSync(systemChrome);

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure',
  },
  projects: useSystemChrome ? [{ name: 'chrome', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: systemChrome } } }] : [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'pnpm --dir ../.. --filter @be-human/api start', url: 'http://127.0.0.1:3001/health', reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: 'pnpm --dir ../.. --filter @be-human/web start', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
