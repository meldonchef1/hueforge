import { describe, expect, it } from 'vitest';
import cs from './locales/cs.json';
import en from './locales/en.json';

type Tree = { [key: string]: string | Tree };

/**
 * Plural suffixes differ per language — Czech needs four forms where English
 * needs two — so keys are compared by their stem.
 */
const stem = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');

function flatten(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${stem(key)}` : stem(key);
    return typeof value === 'string' ? [path] : flatten(value, path);
  });
}

function placeholders(tree: Tree, prefix = ''): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${stem(key)}` : stem(key);
    if (typeof value === 'string') {
      // Every plural form of a key must interpolate the same names.
      result[path] = [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
    } else {
      Object.assign(result, placeholders(value, path));
    }
  }
  return result;
}

describe('translations', () => {
  it('define the same keys in every language', () => {
    const csKeys = [...new Set(flatten(cs as Tree))].sort();
    const enKeys = [...new Set(flatten(en as Tree))].sort();
    expect(enKeys).toEqual(csKeys);
  });

  it('use the same interpolation placeholders in every language', () => {
    expect(placeholders(en as Tree)).toEqual(placeholders(cs as Tree));
  });

  it('name every panel', () => {
    const panels = ['filamentLibrary', 'preview', 'colorCore', 'heightSlice', 'sourceImage', 'layerSliders', 'modelGeometry'];
    for (const panel of panels) {
      expect((cs as Tree).panels).toHaveProperty(panel);
      expect((en as Tree).panels).toHaveProperty(panel);
    }
  });
});
