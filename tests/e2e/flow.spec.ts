import { test, expect } from '@playwright/test';

test('flux principal', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('email').fill('admin@local.dev');
  await page.getByPlaceholder('password').fill('admin123');
  await page.getByText('Login').click();
  await expect(page.getByText('Catalogue')).toBeVisible();
  await expect(page.getByText('Emplacements')).toBeVisible();
});
