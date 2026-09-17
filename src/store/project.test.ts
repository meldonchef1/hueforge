import { describe, expect, it } from 'vitest';
import { buildProject, parseProject, PROJECT_VERSION } from './project';
import { defaultDoc, defaultLayout } from './defaults';

const image = { name: 'cat.png', dataUrl: 'data:image/png;base64,AAAA' };

describe('buildProject', () => {
  it('stamps the file so it can be recognised later', () => {
    const file = buildProject(defaultDoc(), defaultLayout(), null);
    expect(file.app).toBe('hueforge');
    expect(file.version).toBe(PROJECT_VERSION);
  });

  it('round-trips through JSON', () => {
    const file = buildProject(defaultDoc(), defaultLayout(), image);
    const parsed = parseProject(JSON.parse(JSON.stringify(file)));
    expect(parsed).toEqual(file);
  });
});

describe('parseProject', () => {
  it('refuses anything that is not a project', () => {
    expect(parseProject(null)).toBeNull();
    expect(parseProject({})).toBeNull();
    expect(parseProject({ app: 'something-else' })).toBeNull();
    expect(parseProject('{}')).toBeNull();
  });

  it('fills in defaults for a file missing most of itself', () => {
    const parsed = parseProject({ app: 'hueforge' });
    expect(parsed?.doc).toEqual(defaultDoc());
    expect(parsed?.layout).toEqual(defaultLayout());
    expect(parsed?.image).toBeNull();
  });

  it('keeps the settings a file does carry', () => {
    const parsed = parseProject({
      app: 'hueforge',
      doc: { name: 'portrait', mode: 'lithophane', geometry: { widthMm: 150, detailMm: 0.1 } },
    });
    expect(parsed?.doc.name).toBe('portrait');
    expect(parsed?.doc.mode).toBe('lithophane');
    expect(parsed?.doc.geometry.widthMm).toBe(150);
    expect(parsed?.doc.geometry.detailMm).toBe(0.1);
    // Everything it did not mention falls back.
    expect(parsed?.doc.geometry.maxDepth).toBe(defaultDoc().geometry.maxDepth);
  });

  it('drops values of the wrong type instead of trusting them', () => {
    const parsed = parseProject({
      app: 'hueforge',
      doc: { geometry: { widthMm: 'wide', lockAspect: 'yes' }, heights: { layerHeight: null } },
    });
    expect(parsed?.doc.geometry.widthMm).toBe(defaultDoc().geometry.widthMm);
    expect(parsed?.doc.geometry.lockAspect).toBe(defaultDoc().geometry.lockAspect);
    expect(parsed?.doc.heights.layerHeight).toBe(defaultDoc().heights.layerHeight);
  });

  it('rejects a NaN that JSON turned into null', () => {
    const parsed = parseProject({ app: 'hueforge', doc: { geometry: { maxDepth: null } } });
    expect(parsed?.doc.geometry.maxDepth).toBe(defaultDoc().geometry.maxDepth);
  });

  it('keeps a well-formed stack and drops broken slots', () => {
    const parsed = parseProject({
      app: 'hueforge',
      doc: {
        stack: [
          { filamentId: 'black', startLayer: 0 },
          { filamentId: 'red' },
          { startLayer: 4 },
          { filamentId: 'white', startLayer: 9 },
        ],
      },
    });
    expect(parsed?.doc.stack).toEqual([
      { filamentId: 'black', startLayer: 0 },
      { filamentId: 'white', startLayer: 9 },
    ]);
  });

  it('rounds a fractional start layer and refuses a negative one', () => {
    const parsed = parseProject({
      app: 'hueforge',
      doc: { stack: [{ filamentId: 'a', startLayer: -4 }, { filamentId: 'b', startLayer: 3.6 }] },
    });
    expect(parsed?.doc.stack).toEqual([
      { filamentId: 'a', startLayer: 0 },
      { filamentId: 'b', startLayer: 4 },
    ]);
  });

  it('takes only panel names it knows', () => {
    const parsed = parseProject({
      app: 'hueforge',
      layout: { visible: { preview: false, somethingElse: true } },
    });
    expect(parsed?.layout.visible.preview).toBe(false);
    expect(parsed?.layout.visible).not.toHaveProperty('somethingElse');
  });

  it('keeps an image only when it really is one', () => {
    expect(parseProject({ app: 'hueforge', image })?.image).toEqual(image);
    expect(parseProject({ app: 'hueforge', image: { dataUrl: 'javascript:alert(1)' } })?.image).toBeNull();
    expect(parseProject({ app: 'hueforge', image: { name: 'x' } })?.image).toBeNull();
  });

  it('names an image that arrived without one', () => {
    const parsed = parseProject({ app: 'hueforge', image: { dataUrl: image.dataUrl } });
    expect(parsed?.image?.name).toBe('image');
  });
});
