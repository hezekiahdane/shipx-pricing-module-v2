import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL ?? '';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';

test.describe('Rate Card Viewer', () => {
  test('unauthenticated requests redirect to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /cards also redirects to /login', async ({
    page,
  }) => {
    await page.goto('/cards/NOTEXIST');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('login → see rate cards list → open detail → sign out', async ({
    page,
  }) => {
    // Login
    await page.goto('/en/login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on the list
    await expect(page).toHaveURL(/\/(en\/)?$/);
    await expect(
      page.getByRole('heading', { name: /Rate Cards/i }),
    ).toBeVisible();

    // Click the first card
    const firstCard = page.locator('a[href*="/cards/"]').first();
    await expect(firstCard).toBeVisible();
    const cardHref = await firstCard.getAttribute('href');
    await firstCard.click();

    // Should be on detail page with a rates table
    await expect(page).toHaveURL(new RegExp(cardHref ?? '/cards/'));
    await expect(page.locator('table')).toBeVisible();

    // Sign out
    await page.click('button[type="submit"]:has-text("Sign out")');
    await expect(page).toHaveURL(/\/login/);
  });
});
