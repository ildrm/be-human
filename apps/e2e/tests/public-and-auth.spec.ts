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

test('authenticated planning controls open and persist a new item', async ({ page }, testInfo) => {
  const title = `Playwright ${testInfo.project.name}`;
  await page.goto('/login');
  await page.getByLabel('Email').fill('alex@example.test');
  await page.getByLabel('Password').fill('Demo-Only-Change-Me!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Alex\./ })).toBeVisible();
  await expect(page.getByText(/Fictional demo data is shown here/)).toBeVisible();
  await expect(page.getByText('2h 10m estimated debt')).toHaveCount(0);
  await expect(page.getByText('Move the project review?')).toHaveCount(0);
  await page.getByLabel('Operating mode').selectOption('survival');
  await expect(page.getByRole('heading', { name: 'Planning mode: survival' })).toBeVisible();
  await expect(page.getByText(/This plan has not been checked against your constraints/)).toBeVisible();
  await expect(page.getByText('Project review', { exact: true })).toBeVisible();
  await page.getByLabel('Operating mode').selectOption('recovery');

  await page.getByRole('button', { name: 'Open week plan' }).click();
  await expect(page.getByRole('heading', { name: 'Your week plan' })).toBeVisible();
  await expect(page.locator('.week-list article')).toHaveCount(7);
  await page.getByRole('button', { name: 'Close panel' }).click();

  await page.getByRole('button', { name: 'Add something' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Start time').fill('14:10');
  await page.getByRole('button', { name: 'Add to plan' }).click();
  await expect(page.getByText(title)).toBeVisible();
  await page.reload();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByRole('button', { name: 'Explore your life map' }).click();
  await expect(page.getByRole('heading', { name: 'Your life map' })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();

  await page.getByRole('button', { name: `More options for ${title}` }).click();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText(`${title} removed.`)).toBeVisible();
});
