import { expect, test, type Page } from '@playwright/test';
import { testImage } from './fixtures/makeImage';

const image = { name: 'ramp.png', mimeType: 'image/png', buffer: testImage() };

const statusValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=following-sibling::span');

async function loadImage(page: Page) {
  await page.locator('input[accept="image/*"]').setInputFiles(image);
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—', { timeout: 15_000 });
}

/** Adds a filament from the library by the name shown on its row. */
async function addFilament(page: Page, name: string) {
  await page.locator('li', { hasText: name }).first().getByTitle('Přidat do vrstev').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('hueforge');
  });
  await page.reload();
  // The library is fetched asynchronously on first run.
  await expect(page.locator('li', { hasText: 'Černá' }).first()).toBeVisible({ timeout: 15_000 });
});

test('loads the bundled filament library', async ({ page }) => {
  await expect(page.locator('li', { hasText: 'Bílá' }).first()).toBeVisible();
  await expect(page.locator('li', { hasText: 'Červená' }).first()).toBeVisible();

  // Other materials live behind their own tabs.
  await page.getByRole('tab', { name: 'PETG' }).click();
  await expect(page.locator('li', { hasText: 'Čirá' }).first()).toBeVisible();
});

test('filters the library by search', async ({ page }) => {
  await page.getByLabel('Hledat filament').fill('žlut');
  await expect(page.locator('li', { hasText: 'Žlutá' })).toHaveCount(1);
  await expect(page.locator('li', { hasText: 'Černá' })).toHaveCount(0);
});

test('shows an empty stack until a filament is added', async ({ page }) => {
  await expect(page.getByText('Zatím žádné filamenty')).toBeVisible();

  await addFilament(page, 'Černá');
  await expect(page.getByText('Zatím žádné filamenty')).toHaveCount(0);
  await expect(page.getByRole('slider', { name: /Výška výměny/ })).toHaveCount(1);
});

test('stacks several filaments and keeps the bottom one pinned', async ({ page }) => {
  await loadImage(page);
  await addFilament(page, 'Černá');
  await addFilament(page, 'Červená');
  await addFilament(page, 'Bílá');

  const sliders = page.getByRole('slider', { name: /Výška výměny/ });
  await expect(sliders).toHaveCount(3);
  // Nothing sits below the first filament, so its slider cannot move.
  await expect(sliders.first()).toBeDisabled();
  await expect(sliders.nth(1)).toBeEnabled();
});

test('moves a swap and shows it on the colour core', async ({ page }) => {
  await loadImage(page);
  await addFilament(page, 'Černá');
  await addFilament(page, 'Bílá');

  const swap = page.getByRole('slider', { name: /Výška výměny/ }).nth(1);
  await swap.fill('12');

  // The marker is labelled with the layer it sits on.
  await expect(page.getByRole('button', { name: /Výměna na vrstvě 13/ })).toBeVisible();
});

test('removes a filament from the stack through its context menu', async ({ page }) => {
  await addFilament(page, 'Černá');
  await addFilament(page, 'Bílá');
  await expect(page.getByRole('slider', { name: /Výška výměny/ })).toHaveCount(2);

  // The context menu lives on the whole slot, not on the slider inside it.
  await page.getByText('Bílá', { exact: true }).last().click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Odebrat z vrstev' }).click();

  await expect(page.getByRole('slider', { name: /Výška výměny/ })).toHaveCount(1);
});

test('edits TD from the library and keeps it in the layer panel', async ({ page }) => {
  await addFilament(page, 'Černá');

  // By role: the "measure TD" button carries a similar label.
  const fields = page.getByRole('spinbutton', { name: 'TD filamentu Černá' });
  await fields.first().fill('3.5');
  await fields.first().blur();

  // Both panels read the same filament, so the layer slot must follow.
  await expect(fields.nth(1)).toHaveValue('3.5');
});

test('adds a custom filament', async ({ page }) => {
  await page.getByRole('button', { name: 'Nový', exact: true }).click();
  await expect(page.locator('li', { hasText: 'Nový filament' })).toHaveCount(1);
});

test('exports the library as JSON', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('hueforge-filaments.json');
});

test('keeps the library across a reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Nový', exact: true }).click();
  await expect(page.locator('li', { hasText: 'Nový filament' })).toHaveCount(1);

  await page.reload();
  await page.getByRole('tab', { name: 'PLA', exact: true }).click();
  await expect(page.locator('li', { hasText: 'Nový filament' })).toHaveCount(1);
});

test('undoes adding a filament to the stack', async ({ page }) => {
  await addFilament(page, 'Černá');
  await expect(page.getByRole('slider', { name: /Výška výměny/ })).toHaveCount(1);

  await page.getByRole('menuitem', { name: 'Úpravy', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Zpět' }).click();

  await expect(page.getByRole('slider', { name: /Výška výměny/ })).toHaveCount(0);
});
