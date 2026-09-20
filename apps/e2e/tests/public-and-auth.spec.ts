import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const route of ['/', '/login', '/onboarding']) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, results.violations.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  });
}

test('public landing supports a keyboard-only primary journey', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Be Human/i })).toBeFocused();
  await page.getByRole('link', { name: /Sign in/i }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel('Email')).toBeFocused();
});

test('protected surfaces do not expose private content to anonymous visitors', async ({ page }) => {
  await page.goto('/app/today');
  await expect(page.getByRole('heading', { name: 'Sign in to see your plan.' })).toBeVisible();
  await page.goto('/app/privacy');
  await expect(page.getByText(/Sign in is required|Could not load privacy controls/i)).toBeVisible();
});

test('layout remains usable at a representative mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open your private space/i })).toBeVisible();
});
