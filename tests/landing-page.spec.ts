import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page correctly and handle navigation', async ({ page }) => {
    await page.goto('/');
    
    // Verify landing page elements
    await expect(page.locator('body')).toContainText('GrantFather');
    
    // Use specific selectors to avoid strict mode violations
    // Target the header "Get started" link specifically
    await expect(page.getByRole('banner').getByRole('link', { name: 'Get started' })).toBeVisible();
    // Check for "Start free" button in hero section
    await expect(page.getByRole('link', { name: 'Start free' })).toBeVisible();
    
    // Test navigation to register
    await page.getByRole('link', { name: 'Start free' }).first().click();
    await expect(page).toHaveURL(/.*\/register/);
    
    // Test navigation back to home
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Get started' })).toBeVisible();
  });

  test('should handle protected route redirects correctly', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/applications');
    await expect(page).toHaveURL(/.*\/login/);
    
    await page.goto('/grants');
    await expect(page).toHaveURL(/.*\/login/);
    
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should have proper ARIA labels and semantic HTML', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper semantic HTML
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    
    // Check for ARIA labels on interactive elements using specific selectors
    // Target header links specifically to avoid strict mode violations
    await expect(page.getByRole('banner').getByRole('link', { name: 'Get started' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start free' })).toBeVisible();
  });

  test('should load pages within acceptable time limits', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    
    // Use specific selector to avoid strict mode violations
    // Target header link specifically
    await expect(page.getByRole('banner').getByRole('link', { name: 'Get started' })).toBeVisible();
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000); // 5 second max load time
  });
});
