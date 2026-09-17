import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { testImage } from './fixtures/makeImage';

const image = { name: 'ramp.png', mimeType: 'image/png', buffer: testImage() };

const statusValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=following-sibling::span');

async function loadImage(page: Page) {
  await page.locator('input[accept="image/*"]').setInputFiles(image);
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—', { timeout: 15_000 });
}

async function openFileMenu(page: Page) {
  await page.getByRole('menuitem', { name: 'Soubor', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('hueforge');
  });
  await page.reload();
});

test('keeps the image across a reload', async ({ page }) => {
  await loadImage(page);

  // The autosave is debounced; wait for it to land rather than guessing a delay.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const request = indexedDB.open('hueforge');
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('project')) {
            db.close();
            resolve(false);
            return;
          }
          const get = db.transaction('project', 'readonly').objectStore('project').get('autosave-image');
          get.onsuccess = () => {
            db.close();
            resolve(Boolean(get.result));
          };
          get.onerror = () => {
            db.close();
            resolve(false);
          };
        };
        request.onerror = () => resolve(false);
      }),
    undefined,
    { timeout: 15_000 },
  );

  await page.reload();
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—', { timeout: 15_000 });
  await expect(page.getByText('Přetáhni sem obrázek')).toHaveCount(0);
});

test('saves a project and opens it again', async ({ page }) => {
  await loadImage(page);

  const width = page.getByLabel('Šířka', { exact: true });
  await width.fill('137');
  await width.press('Enter');

  await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    // The accessible name carries the shortcut too, so this cannot be exact.
    page.getByRole('menuitem', { name: /^Uložit/ }).click(),
  ]);
  const path = await download.path();

  // Wipe everything, then read the file back.
  await openFileMenu(page);
  await page.getByRole('menuitem', { name: 'Nový projekt' }).click();
  await expect(width).toHaveValue('100.00');

  await page.locator('input[accept*=".hueforge"]').setInputFiles(path);
  await expect(width).toHaveValue('137.00');
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—', { timeout: 15_000 });
});

test('cuts the model off at the height slice', async ({ page }) => {
  await loadImage(page);

  const slider = page.getByRole('slider', { name: 'Řez výškou' });
  await expect(page.getByRole('button', { name: 'Celý' })).toBeDisabled();

  await slider.fill('0.5');
  await expect(page.getByRole('button', { name: 'Celý' })).toBeEnabled();

  await page.getByRole('button', { name: 'Celý' }).click();
  await expect(slider).toHaveValue('1');
});

test('compares the preview against the source', async ({ page }) => {
  await loadImage(page);

  await page.getByRole('radio', { name: 'Dělicí čára' }).click();
  await expect(page.getByRole('button', { name: 'Posunout dělicí čáru' })).toBeVisible();

  await page.getByRole('radio', { name: 'Překrytí' }).click();
  await expect(page.getByRole('button', { name: 'Posunout dělicí čáru' })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Krytí' })).toBeVisible();
});

test('cycles compare mode with the keyboard', async ({ page }) => {
  await loadImage(page);

  await page.keyboard.press('c');
  await expect(page.getByRole('radio', { name: 'Dělicí čára' })).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('c');
  await expect(page.getByRole('radio', { name: 'Překrytí' })).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('c');
  await expect(page.getByRole('radio', { name: 'Vypnuto' })).toHaveAttribute('aria-checked', 'true');
});

test('paints with the SpotFix brush and takes it back', async ({ page }) => {
  await loadImage(page);
  const before = await statusValue(page, 'Výška meshe').textContent();

  await page.getByRole('button', { name: 'Štětec', exact: true }).click();
  const strength = page.getByRole('slider', { name: 'Síla' });
  await strength.fill('0.5');

  // Drag across the middle of the preview.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('preview canvas has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByRole('button', { name: 'Zrušit úpravy' })).toBeEnabled({ timeout: 10_000 });

  await page.keyboard.press('Control+z');
  await expect(page.getByRole('button', { name: 'Zrušit úpravy' })).toBeDisabled();
  await expect(statusValue(page, 'Výška meshe')).toHaveText(before ?? '');
});

test('exports a 3MF that is a zip', async ({ page }) => {
  await loadImage(page);

  await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Exportovat 3MF' }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('ramp.3mf');
  const bytes = await readFile(await download.path());
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(bytes.includes(Buffer.from('3dmodel.model'))).toBe(true);
});

test('exports the preview as a PNG', async ({ page }) => {
  await loadImage(page);

  await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Exportovat náhled PNG' }).click(),
  ]);

  const bytes = await readFile(await download.path());
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
});

test('shows the first print guide and the shortcut list', async ({ page }) => {
  await page.getByRole('menuitem', { name: 'Nápověda', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Průvodce prvním tiskem' }).click();
  // The empty preview says something similar, so match the heading exactly.
  await expect(page.getByText('Nahraj obrázek', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zavřít' }).click();

  await page.getByRole('menuitem', { name: 'Nápověda', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Klávesové zkratky' }).click();
  // By cell: the top bar has a "Reset pohledu" button with the same words.
  await expect(page.getByRole('cell', { name: 'Ctrl+S' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Reset pohledu' })).toBeVisible();
});
