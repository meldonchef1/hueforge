import { expect, test, type Page } from '@playwright/test';

const openMenu = async (page: Page, label: string) => {
  await page.getByRole('menuitem', { name: label, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Each test starts from a clean layout and language.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('shows every panel of the default layout', async ({ page }) => {
  for (const title of [
    'Knihovna filamentů',
    'Živý 3D náhled',
    'Barevný sloupec',
    'Řez výškou',
    'Zdrojový obrázek',
    'Vrstvy filamentů',
    'Geometrie modelu',
  ]) {
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  }
});

test('starts in the dark theme and switches to light', async ({ page }) => {
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await openMenu(page, 'Předvolby');
  await page.getByRole('menuitemradio', { name: 'Světlé' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('switches the interface to English', async ({ page }) => {
  await openMenu(page, 'Předvolby');
  await page.getByRole('menuitemradio', { name: 'Angličtina' }).click();

  await expect(page.getByRole('menuitem', { name: 'File', exact: true })).toBeVisible();
  await expect(page.getByText('Filament library', { exact: true }).first()).toBeVisible();
});

test('closes a panel from the View menu and brings it back with a layout reset', async ({ page }) => {
  const panel = page.getByText('Barevný sloupec', { exact: true }).first();
  await expect(panel).toBeVisible();

  await openMenu(page, 'Zobrazení');
  await page.getByRole('menuitemcheckbox', { name: 'Barevný sloupec' }).click();
  await expect(page.getByText('Barevný sloupec', { exact: true })).toHaveCount(0);

  await openMenu(page, 'Zobrazení');
  await page.getByRole('menuitem', { name: 'Obnovit výchozí rozvržení' }).click();
  await expect(page.getByText('Barevný sloupec', { exact: true }).first()).toBeVisible();
});

test('remembers the layout across a reload', async ({ page }) => {
  await openMenu(page, 'Zobrazení');
  await page.getByRole('menuitemcheckbox', { name: 'Řez výškou' }).click();
  await expect(page.getByText('Řez výškou', { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Řez výškou', { exact: true })).toHaveCount(0);
});

test('validates the first layer height against the layer height', async ({ page }) => {
  const field = page.getByLabel('První vrstva', { exact: true });
  await field.fill('0.15');
  await field.blur();

  await expect(page.getByRole('alert')).toContainText('násobek');
});

test('undoes a change made in the top bar', async ({ page }) => {
  const lithophane = page.getByRole('radio', { name: 'Litofanie' });
  await lithophane.click();
  await expect(lithophane).toHaveAttribute('aria-checked', 'true');

  await openMenu(page, 'Úpravy');
  await page.getByRole('menuitem', { name: 'Zpět' }).click();

  await expect(page.getByRole('radio', { name: 'Malování filamentem' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
