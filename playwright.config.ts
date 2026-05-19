import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정
 *
 * 사전 준비:
 *   npm install -D @playwright/test
 *   npx playwright install --with-deps chromium
 *
 * 실행:
 *   npx playwright test                       # 전체
 *   npx playwright test e2e/deposit          # deposit만
 *   npx playwright test --ui                 # UI 모드
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/global-setup.ts', '**/fixtures/**', '**/.auth/**'],
  globalSetup: require.resolve('./e2e/global-setup'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // dev 서버 자동 기동은 비활성. 사용자가 미리 npm run dev 실행 권장.
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
