import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/** Opens the TD calibration dialog for a filament named on its library row. */
async function openCalibration(page: Page, name: string) {
  await page.locator('li', { hasText: name }).first().getByRole('button', { name: /Změřit TD/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('hueforge');
  });
  await page.reload();
  await expect(page.locator('li', { hasText: 'Černá' }).first()).toBeVisible({ timeout: 15_000 });
});

test('opens the calibration dialog from the library', async ({ page }) => {
  await openCalibration(page, 'Modrá');
  await expect(page.getByRole('heading', { name: /Kalibrace TD/ })).toBeVisible();
  await expect(page.getByText('Generic Modrá').first()).toBeVisible();
});

test('works out TD from the counted step', async ({ page }) => {
  await openCalibration(page, 'Modrá');
  await expect(page.getByText('Zadej číslo schodu')).toBeVisible();

  // Defaults: 2 layers per step at 0.08 mm, so step 9 means 1.44 mm.
  const step = page.getByLabel('Schod', { exact: true });
  await step.fill('9');
  await step.press('Enter');

  await expect(page.getByText('TD 1.44 mm')).toBeVisible();
});

test('saves the measured TD back to the filament', async ({ page }) => {
  await openCalibration(page, 'Modrá');

  const step = page.getByLabel('Schod', { exact: true });
  await step.fill('5');
  await step.press('Enter');
  await page.getByRole('button', { name: 'Uložit TD' }).click();

  // Dialog closes and the library row shows the new value.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // By role, so the "measure TD" button's label does not also match.
  await expect(page.getByRole('spinbutton', { name: 'TD filamentu Modrá' })).toHaveValue('0.8');
});

test('follows the wedge settings when working out TD', async ({ page }) => {
  await openCalibration(page, 'Modrá');

  const perStep = page.getByLabel('Vrstev na schod', { exact: true });
  await perStep.fill('1');
  await perStep.press('Enter');

  const step = page.getByLabel('Schod', { exact: true });
  await step.fill('10');
  await step.press('Enter');

  // One layer per step at 0.08 mm: ten steps is 0.80 mm, not 1.60.
  await expect(page.getByText('TD 0.80 mm')).toBeVisible();
});

test('exports the wedge as an STL', async ({ page }) => {
  await openCalibration(page, 'Modrá');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportovat STL vzorku' }).click(),
  ]);

  expect(download.suggestedFilename()).toContain('td-');
  const bytes = await readFile(await download.path());
  const count = bytes.readUInt32LE(80);
  expect(count).toBeGreaterThan(0);
  expect(bytes.length).toBe(84 + count * 50);
});

test('exports wedge instructions with the step table', async ({ page }) => {
  await openCalibration(page, 'Modrá');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportovat instrukce' }).click(),
  ]);

  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Měřený filament: Generic Modrá');
  expect(text).toContain('vyměň za');
  // The table must cover every step of the wedge.
  expect(text.match(/^\s+\d+ \|/gm)?.length).toBe(12);
});

test('exports swap instructions for the project', async ({ page }) => {
  await page.locator('li', { hasText: 'Černá' }).first().getByTitle('Přidat do vrstev').click();
  await page.locator('li', { hasText: 'Bílá' }).first().getByTitle('Přidat do vrstev').click();

  await page.getByRole('menuitem', { name: 'Soubor', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Exportovat instrukce výměn' }).click(),
  ]);

  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('založ Generic Černá');
  expect(text).toContain('vyměň za Generic Bílá');
});

test('offers swap instructions only once the stack has filaments', async ({ page }) => {
  await page.getByRole('menuitem', { name: 'Soubor', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Exportovat instrukce výměn' })).toBeDisabled();
});

test('tunes the transmission model and puts it back', async ({ page }) => {
  await openCalibration(page, 'Modrá');
  await page.getByText('Model průchodu světla').click();

  const slider = page.getByRole('slider', { name: 'Krytí při TD' });
  await expect(slider).toHaveValue('0.1');

  await slider.fill('0.25');
  await expect(page.getByText('25 %')).toBeVisible();

  await page.getByRole('button', { name: 'Výchozí' }).click();
  await expect(slider).toHaveValue('0.1');
});
