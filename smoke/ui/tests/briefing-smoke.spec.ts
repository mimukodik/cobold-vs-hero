import { expect, Page, test } from '@playwright/test';

const appPath = process.env.COBOLD_API_BASE_URL
  ? `/?bffBaseUrl=${encodeURIComponent(process.env.COBOLD_API_BASE_URL)}`
  : '/';

async function createBackendBriefing(page: Page): Promise<void> {
  await page.goto(appPath);
  await expect(page.locator('[data-test="system-status"]')).toHaveText('UP');
  await page.locator('[data-test="change-title-input"]').fill('Backend evidence approval');
  await page.locator('[data-test="change-description-input"]').fill('Review one focused backend test.');
  for (const surface of ['bff', 'frontend']) {
    await page.locator(`[data-test="surface-${surface}"]`).uncheck();
  }
  await page.locator('[data-test="request-briefing-button"]').click();
  await expect(page.locator('[data-test="evidence-status-backend-test"]')).toHaveText('tervezett');
}

async function attachBackendEvidence(page: Page): Promise<void> {
  await page.locator('[data-test="evidence-url-backend-test"]').fill('https://example.test/backend-test');
  await page.locator('[data-test="attach-evidence-backend-test"]').click();
  await expect(page.locator('[data-test="evidence-status-backend-test"]')).toHaveText('csatolva');
}

test('URL required to attach', async ({ page }) => {
  await createBackendBriefing(page);
  await page.locator('[data-test="attach-evidence-backend-test"]').click();
  await expect(page.locator('[data-test="evidence-error-backend-test"]')).toContainText('URL');
  await expect(page.locator('[data-test="evidence-status-backend-test"]')).toHaveText('tervezett');
});

test('attached but not approved is not ready', async ({ page }) => {
  await createBackendBriefing(page);
  await attachBackendEvidence(page);
  await expect(page.locator('[data-test="briefing-status"]')).toHaveText('NOT_READY');
  await expect(page.locator('[data-test="missing-evidence"]')).toContainText('jóváhagyásra vár: API reviewer');
});

test('assigned reviewer approves attached evidence', async ({ page }) => {
  await createBackendBriefing(page);
  await attachBackendEvidence(page);
  await page.locator('[data-test="role-switcher"]').selectOption('api-reviewer');
  await page.locator('[data-test="approve-evidence-backend-test"]').click();
  await expect(page.locator('[data-test="evidence-status-backend-test"]')).toHaveText('jóváhagyva');
});

test('reviewer rejection requires and displays a comment', async ({ page }) => {
  await createBackendBriefing(page);
  await attachBackendEvidence(page);
  await page.locator('[data-test="role-switcher"]').selectOption('api-reviewer');
  await page.locator('[data-test="reject-evidence-backend-test"]').click();
  await expect(page.locator('[data-test="evidence-error-backend-test"]')).toContainText('kötelező');
  await page.locator('[data-test="rejection-comment-backend-test"]').fill('Add the missing edge case.');
  await page.locator('[data-test="reject-evidence-backend-test"]').click();
  await expect(page.locator('[data-test="evidence-status-backend-test"]')).toHaveText('tervezett');
  await expect(page.locator('[data-test="rejection-comment-visible-backend-test"]')).toContainText(
    'Add the missing edge case.',
  );
});

test('all required evidence approved makes the briefing ready', async ({ page }) => {
  await createBackendBriefing(page);
  await attachBackendEvidence(page);
  await page.locator('[data-test="role-switcher"]').selectOption('api-reviewer');
  await page.locator('[data-test="approve-evidence-backend-test"]').click();
  await expect(page.locator('[data-test="briefing-status"]')).toHaveText('READY');
  await expect(page.locator('[data-test="briefing-signal"]')).toHaveText('truce');
});

test('production flag requires tech lead approval for design evidence', async ({ page }) => {
  await page.goto(appPath);
  await page.locator('[data-test="risk-production"]').check();
  await page.locator('[data-test="request-briefing-button"]').click();
  const hld = page.locator('[data-test="evidence-status-hld"]').locator('xpath=ancestor::article[1]');
  await expect(hld).toContainText('Jóváhagyó: Tech lead');
  await page.locator('[data-test="evidence-url-hld"]').fill('https://example.test/hld');
  await page.locator('[data-test="attach-evidence-hld"]').click();
  await page.locator('[data-test="role-switcher"]').selectOption('api-reviewer');
  await expect(page.locator('[data-test="approve-evidence-hld"]')).toHaveCount(0);
  await page.locator('[data-test="role-switcher"]').selectOption('tech-lead');
  await expect(page.locator('[data-test="approve-evidence-hld"]')).toBeVisible();
});
