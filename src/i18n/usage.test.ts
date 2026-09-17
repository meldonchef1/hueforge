import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import cs from './locales/cs.json';

/**
 * Catches translation keys used in the interface but never defined. A missing
 * key does not crash — i18next just prints the key itself — so it slips through
 * everything except someone looking at that exact screen.
 */

type Tree = { [key: string]: string | Tree };

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.tsx?$/.test(path) && !path.endsWith('.test.ts') && !path.endsWith('.test.tsx')) {
      files.push(path);
    }
  }
  return files;
}

function has(tree: Tree, key: string): boolean {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return false;
    node = node[part];
  }
  // A plural key resolves to several entries, none of them the bare stem.
  if (node === undefined) {
    const parts = key.split('.');
    const leaf = parts.pop() ?? '';
    let parent: string | Tree | undefined = tree;
    for (const part of parts) {
      if (typeof parent !== 'object' || parent === null) return false;
      parent = parent[part];
    }
    if (typeof parent !== 'object' || parent === null) return false;
    return Object.keys(parent).some((candidate) => candidate.startsWith(`${leaf}_`));
  }
  return typeof node === 'string';
}

describe('translation usage', () => {
  it('defines every key the interface asks for', () => {
    const missing: string[] = [];

    for (const file of walk('src/ui')) {
      const source = readFileSync(file, 'utf8');
      // Only plain literals; keys built from variables cannot be checked here.
      for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        const key = match[1];
        if (!has(cs as Tree, key)) missing.push(`${file}: ${key}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
