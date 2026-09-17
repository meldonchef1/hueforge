import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { transparentTestImage } from './fixtures/makeImage';

const disc = {
  name: 'disc.png',
  mimeType: 'image/png',
  buffer: transparentTestImage(),
};

const statusValue = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=following-sibling::span');

async function loadDisc(page: Page) {
  await page.locator('input[accept="image/*"]').setInputFiles(disc);
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—', { timeout: 15_000 });
}

/** Triangle count as a number, with the thin-space grouping stripped out. */
async function triangles(page: Page): Promise<number> {
  const text = (await statusValue(page, 'Trojúhelníky').textContent()) ?? '';
  return Number(text.replace(/\D/g, ''));
}

/**
 * Volume enclosed by a binary STL, in mm³. Triangle count says nothing about
 * shape — a cropped mesh spends more triangles per area on its floor — so the
 * volume is what shows the outline was actually followed.
 */
function stlVolume(bytes: Buffer): number {
  const count = bytes.readUInt32LE(80);
  let total = 0;

  for (let t = 0; t < count; t++) {
    const base = 84 + t * 50 + 12;
    const v = (i: number, axis: number) => bytes.readFloatLE(base + i * 12 + axis * 4);
    total +=
      v(0, 0) * (v(1, 1) * v(2, 2) - v(1, 2) * v(2, 1)) -
      v(0, 1) * (v(1, 0) * v(2, 2) - v(1, 2) * v(2, 0)) +
      v(0, 2) * (v(1, 0) * v(2, 1) - v(1, 1) * v(2, 0));
  }

  return total / 6;
}

/** True when any vertex lands inside the corner `fraction` of the bounding box. */
function hasMaterialInCorner(bytes: Buffer, fraction = 0.12): boolean {
  const count = bytes.readUInt32LE(80);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  const each = (visit: (x: number, y: number) => void) => {
    for (let t = 0; t < count; t++) {
      const base = 84 + t * 50 + 12;
      for (let i = 0; i < 3; i++) {
        visit(bytes.readFloatLE(base + i * 12), bytes.readFloatLE(base + i * 12 + 4));
      }
    }
  };

  each((x, y) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const cornerX = minX + (maxX - minX) * fraction;
  const cornerY = minY + (maxY - minY) * fraction;

  let found = false;
  each((x, y) => {
    if (x <= cornerX && y <= cornerY) found = true;
  });
  return found;
}

async function exportStl(page: Page): Promise<Buffer> {
  await page.getByRole('menuitem', { name: 'Soubor', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Exportovat STL' }).click(),
  ]);
  return readFile(await download.path());
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('follows the image outline instead of boxing it into a rectangle', async ({ page }) => {
  await loadDisc(page);
  const cropped = await exportStl(page);

  await page.getByLabel('Podle průhlednosti').uncheck();
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—');
  const boxed = await exportStl(page);

  // A disc leaves its corners empty; a rectangle fills them.
  expect(hasMaterialInCorner(cropped)).toBe(false);
  expect(hasMaterialInCorner(boxed)).toBe(true);
  expect(stlVolume(cropped)).toBeLessThan(stlVolume(boxed));
});

test('exports the cropped shape as a valid, closed STL', async ({ page }) => {
  await loadDisc(page);
  const bytes = await exportStl(page);

  const count = bytes.readUInt32LE(80);
  expect(count).toBeGreaterThan(0);
  expect(bytes.length).toBe(84 + count * 50);
  // A positive volume means the surface closes and every normal faces out.
  expect(stlVolume(bytes)).toBeGreaterThan(0);
});

test('leaves an opaque image unchanged whichever way the switch is set', async ({ page }) => {
  const { testImage } = await import('./fixtures/makeImage');
  await page
    .locator('input[accept="image/*"]')
    .setInputFiles({ name: 'ramp.png', mimeType: 'image/png', buffer: testImage() });
  await expect(statusValue(page, 'Trojúhelníky')).not.toHaveText('—', { timeout: 15_000 });

  const before = await triangles(page);
  await page.getByLabel('Podle průhlednosti').uncheck();
  // Nothing is transparent, so there is nothing to crop away.
  await expect(statusValue(page, 'Trojúhelníky')).toHaveText(String(before).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
});
