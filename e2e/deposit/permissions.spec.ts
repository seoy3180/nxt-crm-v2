import { test, expect } from '../fixtures/auth';

async function gotoContractByName(page: import('@playwright/test').Page, name: string) {
  await page.goto('/msp/contracts');
  await page.getByPlaceholder(/계약명.*검색/).fill(name);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '상세보기' }).first().click();
  await page.waitForURL(/\/contracts\//);
}

test.describe('예치금 — 권한 매트릭스', () => {
  test('AS-2: 영업 — adjustment/refund 버튼 미노출', async ({ mspSalesPage: page }) => {
    await gotoContractByName(page, '디스코');
    await page.getByText('예치금 계좌').first().waitFor();

    await expect(page.getByRole('button', { name: '+ 예치 등록' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '− 사용 차감' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '잔액 보정' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '환불 등록' })).toHaveCount(0);
  });

  test('admin: adjustment/refund 버튼 노출', async ({ adminPage: page }) => {
    await gotoContractByName(page, '디스코');
    await page.getByText('예치금 계좌').first().waitFor();

    await expect(page.getByRole('button', { name: '잔액 보정' })).toBeVisible();
    await expect(page.getByRole('button', { name: '환불 등록' })).toBeVisible();
  });

  test('EF-2: 비-MSP 팀(Education staff) — 사이드바 예치금 메뉴 미노출', async ({ eduStaffPage: page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /^예치금/ })).toHaveCount(0);
  });
});
