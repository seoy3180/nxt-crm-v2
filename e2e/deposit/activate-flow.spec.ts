import { test, expect } from '../fixtures/auth';

test.describe('예치금 — 활성화/비활성화', () => {
  test('AF-1: 시드 외 MSP 계약 → 활성화 → Empty State → 비활성화 (자체 cleanup)', async ({ mspSalesPage: page }) => {
    await page.goto('/msp/contracts');

    // 시드된 3개(코난테크/디스코/서울대) 제외한 다른 MSP 계약 link 찾기
    const otherLink = page
      .getByRole('link')
      .filter({ hasText: /MSP$/ })
      .filter({ hasNotText: /코난테크\(염종학\)|디스코|서울대학교_천둥연구실/ })
      .first();

    if (!(await otherLink.isVisible().catch(() => false))) {
      test.skip(true, '시드 외 활성 MSP 계약을 찾지 못해 spec 스킵');
      return;
    }
    await otherLink.click();
    await page.waitForURL(/\/contracts\//);

    // 활성화 버튼 찾기 — 화면에 노출되어야 함
    const activateBtn = page.getByRole('button', { name: '예치금 계좌 활성화' });
    await expect(activateBtn).toBeVisible({ timeout: 5000 });
    await activateBtn.click();

    // 확인 모달
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '활성화', exact: true }).click();

    // 활성화 토스트
    await expect(page.getByText(/예치금 계좌가 활성화되었습니다/)).toBeVisible({ timeout: 5000 });

    // 풀폭 카드에 "현재 잔액" 영역 노출 (잔액 0)
    await expect(page.getByText('현재 잔액').first()).toBeVisible();

    // === Cleanup: 트랜잭션 0건이라 비활성화 가능 ===
    await page.getByRole('button', { name: '비활성화' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '비활성화', exact: true }).click();
    await expect(page.getByText(/예치금 계좌가 비활성화되었습니다/)).toBeVisible({ timeout: 5000 });
  });

  test('BL-6: 트랜잭션 있는 계좌 비활성화 차단', async ({ adminPage: page }) => {
    await page.goto('/msp/contracts');
    await page.getByPlaceholder(/계약명.*검색/).fill('디스코');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '상세보기' }).first().click();
    await page.waitForURL(/\/contracts\//);
    await page.getByText('예치금 계좌').first().waitFor();

    await page.getByRole('button', { name: '비활성화' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 차단 메시지 + "비활성화" 진행 버튼 없음
    await expect(page.getByText(/트랜잭션이 있는 계좌는 비활성화할 수 없습니다/)).toBeVisible();
    await expect(page.getByRole('button', { name: '비활성화', exact: true })).toHaveCount(0);
  });
});
