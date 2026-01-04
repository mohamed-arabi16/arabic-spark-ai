import { test, expect } from '@playwright/test';

test('baseline app load', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/AI Workspace/);
});
