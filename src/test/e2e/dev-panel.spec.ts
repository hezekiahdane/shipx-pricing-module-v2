import { expect, test } from '@playwright/test';

test.describe('Dev Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('FAB is visible on page load', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Toggle dev panel' }),
    ).toBeVisible();
  });

  test('backtick opens and closes the panel', async ({ page }) => {
    await page.keyboard.press('`');
    await expect(page.getByText('Dev Panel')).toBeVisible();
    await page.keyboard.press('`');
    await expect(page.getByText('Dev Panel')).not.toBeVisible();
  });

  test('FAB toggles panel open and closed', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle dev panel' }).click();
    await expect(page.getByText('Dev Panel')).toBeVisible();
    await page.getByRole('button', { name: 'Toggle dev panel' }).click();
    await expect(page.getByText('Dev Panel')).not.toBeVisible();
  });

  test('debug outline toggle adds class to body', async ({ page }) => {
    await page.keyboard.press('`');
    await page
      .getByText('Debug outlines')
      .locator('..')
      .getByRole('button')
      .click();
    await expect(page.locator('body')).toHaveClass(/debug-outlines/);
  });
});

// Run with: NODE_ENV=production npx playwright test dev-panel --grep "production"
test.describe('Dev Panel — production exclusion', () => {
  test('panel FAB is absent in production build', async ({ page }) => {
    // This test must run against a production build: `npm run build && npm run start`
    // Set baseURL in playwright.config.ts to the production port (e.g. 3000) when running this block
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Toggle dev panel' }),
    ).not.toBeVisible();
  });
});
