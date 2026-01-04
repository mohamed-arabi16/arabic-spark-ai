
import { test, expect } from '@playwright/test';

test('Verify Phase 4 Changes', async ({ page }) => {
  // Go to Chat page
  await page.goto('/chat');

  // 1. Verify Model Help Panel
  // Open the help panel using the help icon
  const helpButton = page.getByTitle('What changes?');
  await expect(helpButton).toBeVisible();
  await helpButton.click();

  // Verify dialog opens
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByText('AI Models')).toBeVisible();
  await expect(page.getByText('Fastest response time')).toBeVisible();

  // Take screenshot of Model Help Panel
  await page.screenshot({ path: '/home/jules/verification/model_help.png' });

  // Close dialog
  await page.keyboard.press('Escape');

  // 2. Verify Dialect Enforcement UI
  // We need a message to be present to verify "Correct Dialect" button,
  // but since we can't easily generate one without backend mocking in this quick verify,
  // we will check if the "Dialect" picker is updated/working.

  // Check Dialect Picker in UI
  const dialectPicker = page.getByText('MSA (Fusha)'); // Default
  await expect(dialectPicker).toBeVisible();

  // 3. Verify Dark Mode Contrast (indirectly via screenshot)
  // Toggle dark mode if possible (need to check how to toggle)
  // Usually there is a theme toggle, but for now we will just screenshot the default (light)
  // or check if we can force dark mode via class.

  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });

  // Take screenshot in Dark Mode
  await page.screenshot({ path: '/home/jules/verification/dark_mode_chat.png' });
});
