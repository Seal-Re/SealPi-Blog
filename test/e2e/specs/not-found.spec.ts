import { test, expect } from '@playwright/test';

test('non-existent slug returns 404', async ({ page }) => {
  const res = await page.goto('/blog/this-slug-does-not-exist-xyz-9999');
  // Either status is 404 OR page contains 404 indicator
  const status = res?.status();
  const has404Text = await page.locator('text=/404|not found/i').count();
  expect(status === 404 || has404Text > 0, `expected 404 status or text; got status=${status} and text-count=${has404Text}`).toBeTruthy();
});
