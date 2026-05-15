import { test as base, type Page } from '@playwright/test';
import path from 'path';

/**
 * 인증 fixture — global-setup에서 저장한 storageState 파일을 재사용.
 * 매 spec 로그인 X (timeout 누적 방지).
 */

const AUTH_DIR = path.join(process.cwd(), 'e2e/.auth');

export const test = base.extend<{
  adminPage: Page;
  mspSalesPage: Page;
  eduStaffPage: Page;
}>({
  // storageState를 사용하는 페이지 fixture
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, 'admin.json') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  mspSalesPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, 'msp-sales.json') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  eduStaffPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: path.join(AUTH_DIR, 'edu-staff.json') });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
