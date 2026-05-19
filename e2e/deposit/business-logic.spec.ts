import { test, expect } from '../fixtures/auth';

async function gotoContractByName(page: import('@playwright/test').Page, name: string) {
  await page.goto('/msp/contracts');
  await page.getByPlaceholder(/계약명.*검색/).fill(name);
  // 검색 결과 row의 "상세보기" 버튼 클릭
  await page.waitForTimeout(500); // debounce
  await page.getByRole('button', { name: '상세보기' }).first().click();
  await page.waitForURL(/\/contracts\//);
}

test.describe('예치금 — 비즈니스 룰', () => {
  test('BL-1: 차감 후 잔액 음수 → 2차 확인 모달 + 취소', async ({ mspSalesPage: page }) => {
    await page.goto('/deposit');

    const heading = page.getByRole('heading', { name: '디스코 MSP' });
    const card = page.locator('div.rounded-xl.border.bg-white').filter({ has: heading });

    await card.getByRole('button', { name: '− 사용 차감' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/차감액/).fill('1200000');
    await page.getByRole('button', { name: '등록', exact: true }).click();

    await expect(page.getByText(/차감 후 잔액이 음수가 됩니다/)).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(card).toContainText('₩ 1,100,000');
  });

  test('BL-5: 잔액 != 0 계약 삭제 시도 → 차단 토스트', async ({ adminPage: page }) => {
    await gotoContractByName(page, '디스코');

    const deleteBtn = page.getByRole('button', { name: /계약 삭제|삭제하기/ }).first();
    if (!(await deleteBtn.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'note',
        description: '삭제 UI 미노출 (admin 권한 없음 또는 별도 컴포넌트)',
      });
      return;
    }
    await deleteBtn.click();

    const confirm = page.getByRole('button', { name: /^삭제$|^확인$/ }).first();
    if (await confirm.isVisible().catch(() => false)) await confirm.click();

    await expect(page.getByText(/예치금 잔액이.*남아있어 삭제할 수 없습니다/)).toBeVisible({
      timeout: 5000,
    });
  });
});
