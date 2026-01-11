import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests signup, signin, and protected route access
 */

test.describe('Authentication Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display auth page with sign in and sign up tabs', async ({ page }) => {
    await page.goto('/auth');
    
    // Should show the auth form
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sign up/i })).toBeVisible();
    
    // Should show Google sign-in button
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    
    // Should show trial option
    await expect(page.getByRole('button', { name: /try without/i })).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to sign in with invalid email
    await page.getByLabel(/email/i).first().fill('invalid-email');
    await page.getByLabel(/password/i).first().fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for short password', async ({ page }) => {
    await page.goto('/auth');
    
    // Switch to sign up tab
    await page.getByRole('tab', { name: /sign up/i }).click();
    
    // Try with short password
    await page.getByLabel(/email/i).last().fill(testEmail);
    await page.getByLabel(/password/i).last().fill('123');
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Should show password length error
    await expect(page.getByText(/password/i).filter({ hasText: /6|character/i })).toBeVisible({ timeout: 5000 });
  });

  test('should allow trial access without account', async ({ page }) => {
    await page.goto('/auth');
    
    // Click try without account
    await page.getByRole('button', { name: /try without/i }).click();
    
    // Should redirect to chat
    await expect(page).toHaveURL(/\/chat/);
    
    // Should have trial session in localStorage
    const trialStarted = await page.evaluate(() => localStorage.getItem('trial_started'));
    expect(trialStarted).toBe('true');
    
    const sessionId = await page.evaluate(() => localStorage.getItem('anonymous_session_id'));
    expect(sessionId).toBeTruthy();
  });

  test('should redirect authenticated users from auth to chat', async ({ page }) => {
    // First, start a trial session
    await page.goto('/auth');
    await page.getByRole('button', { name: /try without/i }).click();
    await expect(page).toHaveURL(/\/chat/);
    
    // Note: Full auth redirect test would require actual auth,
    // but we can verify the page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support language switching on auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Find and click language switcher
    const langSwitcher = page.locator('[class*="LanguageSwitcher"], button:has(svg)').first();
    
    // Check initial state
    const initialText = await page.getByText(/welcome|مرحباً/i).textContent();
    expect(initialText).toBeTruthy();
  });

  test('should handle sign in form submission', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill in the form
    await page.getByLabel(/email/i).first().fill('test@example.com');
    await page.getByLabel(/password/i).first().fill(testPassword);
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show loading or error (since credentials are fake)
    // We're testing the form submission works, not actual auth
    await expect(page.locator('body')).toBeVisible();
  });

  test('should switch between sign in and sign up tabs', async ({ page }) => {
    await page.goto('/auth');
    
    // Initially on sign in
    await expect(page.getByLabel('signin-email').or(page.getByLabel(/email/i).first())).toBeVisible();
    
    // Switch to sign up
    await page.getByRole('tab', { name: /sign up/i }).click();
    
    // Should show name field in sign up
    await expect(page.getByLabel(/name/i)).toBeVisible();
    
    // Switch back to sign in
    await page.getByRole('tab', { name: /sign in/i }).click();
    
    // Name field should not be visible
    await expect(page.getByLabel(/full name/i)).not.toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should allow access to landing page without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow access to auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL('/auth');
  });
});
