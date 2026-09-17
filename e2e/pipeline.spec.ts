import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { testImage } from './fixtures/makeImage';

const image = { name: 'ramp.png', mimeType: 'image/png', buffer: testImage() };

async function loadImage(page: Page) {
  // The filament library has a file input too, so pick the one taking images.
  await page.locator('input[accept="image/*"]').setInputFiles(image);
  // The status bar only fills in once the worker has returned a mesh.
  await expect(page.getByText('Trojúhelníky').locator('xpath=following-sibling::span')).not.toHaveText(
    '—',
    { timeout: 15_000 },
  );
}

const statusValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=following-sibling::span');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('builds a mesh from a loaded image', async ({ page }) => {
  await expect(page.getByText('Přetáhni sem obrázek')).toBeVisible();
  await loadImage(page);

  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—');
  await expect(statusValue(page, 'Vrstvy')).not.toHaveText('—');
  // Default geometry tops out at 2.56 mm.
  await expect(statusValue(page, 'Výška meshe')).toHaveText('2.56 mm');
});

test('keeps the proportions of the loaded image', async ({ page }) => {
  await loadImage(page);
  // The fixture is 120x90, so a 100 mm width means a 75 mm height.
  await expect(page.getByLabel('Výška', { exact: true })).toHaveValue('75.00');
});

test('rebuilds when the geometry changes', async ({ page }) => {
  await loadImage(page);
  const before = await statusValue(page, 'Trojúhelníky').textContent();

  const detail = page.getByLabel('Velikost detailu', { exact: true });
  await detail.fill('1');
  await detail.press('Enter');

  // A coarser detail setting must mean fewer triangles.
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText(before ?? '');
});

test('raises the model when max depth grows', async ({ page }) => {
  await loadImage(page);
  const depth = page.getByLabel('Max hloubka', { exact: true });
  await depth.fill('4');
  await depth.press('Enter');

  await expect(statusValue(page, 'Výška meshe')).toHaveText('4.00 mm');
});

test('reads brightness and height with the eyedropper', async ({ page }) => {
  await loadImage(page);
  await expect(page.getByText('Klikni do obrázku')).toBeVisible();

  // The 3D preview is a canvas too, so target the source image by its label.
  const canvas = page.getByRole('img', { name: 'Zdroj' });
  await canvas.click({ position: { x: 5, y: 5 } });

  const readout = page.getByText(/Jas \d+ %/);
  await expect(readout).toBeVisible();
  await expect(readout).toContainText('mm');
});

test('exports a binary STL', async ({ page }) => {
  await loadImage(page);

  await page.getByRole('menuitem', { name: 'Soubor', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Exportovat STL' }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('ramp.stl');

  const path = await download.path();
  const bytes = await readFile(path);
  const triangles = bytes.readUInt32LE(80);

  expect(triangles).toBeGreaterThan(0);
  expect(bytes.length).toBe(84 + triangles * 50);
  // A binary STL must not open with "solid", or readers pick the wrong parser.
  expect(bytes.subarray(0, 5).toString('ascii')).not.toBe('solid');
});

test('offers the STL export only once a mesh exists', async ({ page }) => {
  await page.getByRole('menuitem', { name: 'Soubor', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Exportovat STL' })).toBeDisabled();
});
