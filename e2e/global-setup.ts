import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

/**
 * Global setup — 3개 역할 로그인 후 storageState 저장.
 * 각 로그인은 독립 — 실패해도 다른 role은 진행.
 */
async function loginAndSave(
  baseURL: string,
  email: string,
  password: string,
  outFile: string,
): Promise<boolean> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseURL}/login`);
    await page.getByPlaceholder('이메일을 입력하세요').fill(email);
    await page.getByPlaceholder('비밀번호를 입력하세요').fill(password);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
    await context.storageState({ path: outFile });
    return true;
  } catch (e) {
    console.warn(`[global-setup] login failed: ${email} (${(e as Error).message})`);
    return false;
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
  const password = process.env.E2E_PASSWORD ?? '12345678aA';

  const dir = path.join(process.cwd(), 'e2e/.auth');
  await fs.mkdir(dir, { recursive: true });

  const adminFile = path.join(dir, 'admin.json');
  const salesFile = path.join(dir, 'msp-sales.json');
  const eduFile = path.join(dir, 'edu-staff.json');

  const adminOk = await loginAndSave(
    baseURL,
    process.env.E2E_ADMIN_EMAIL ?? 'karin.kim@nxtcloud.kr',
    password,
    adminFile,
  );
  const salesOk = await loginAndSave(
    baseURL,
    process.env.E2E_MSP_SALES_EMAIL ?? 'sik.ham@nxtcloud.kr',
    password,
    salesFile,
  );
  const eduOk = await loginAndSave(
    baseURL,
    process.env.E2E_EDU_STAFF_EMAIL ?? 'ella.kim@nxtcloud.kr',
    password,
    eduFile,
  );

  // Fallback: admin 로그인 실패 시 msp_sales 토큰으로 admin 자리 채움
  // (admin-only spec은 fail이 의미 있게 = 권한 없음 검증)
  if (!adminOk && salesOk) {
    await fs.copyFile(salesFile, adminFile);
    console.warn('[global-setup] admin storageState ← msp-sales (fallback)');
  }
  if (!eduOk && salesOk) {
    await fs.copyFile(salesFile, eduFile);
    console.warn('[global-setup] edu-staff storageState ← msp-sales (fallback)');
  }
  if (!salesOk) {
    throw new Error('msp_sales 로그인 실패 — 테스트 진행 불가. 비밀번호 확인 필요.');
  }
}
