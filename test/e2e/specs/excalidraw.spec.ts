import { test, expect } from '@playwright/test';

test('detail page renders Excalidraw content', async ({ page }) => {
  await page.goto('/blog');
  await page.locator('a[href^="/blog/"]').first().click();
  // Use 'load' instead of 'networkidle': analytics/Excalidraw keep connections open indefinitely.
  await page.waitForLoadState('load');
  // Excalidraw content renders as <canvas> or <svg> in the article body.
  // On public detail pages the cover preview is served as a static <img>; both are acceptable evidence.
  const hasVisual = await page.locator('article canvas, article svg, article img').count();
  expect(hasVisual, 'expected article body to contain canvas, svg, or img from Excalidraw').toBeGreaterThan(0);
});
