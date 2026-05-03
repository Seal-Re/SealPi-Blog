import { test, expect } from '@playwright/test';

test('blog list → detail navigation', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveTitle(/.+/);
  const firstLink = page.locator('a[href^="/blog/"]').first();
  await expect(firstLink).toBeVisible();
  const href = await firstLink.getAttribute('href');
  await firstLink.click();
  await page.waitForURL(`**${href}`);
  await expect(page.locator('h1').first()).toBeVisible();
});
