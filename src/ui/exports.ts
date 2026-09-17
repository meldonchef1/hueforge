import i18n from '../i18n';
import { writeBinaryStl } from '../core/stl';
import { write3mf } from '../core/threemf';
import { activeViewer } from '../render/activeViewer';
import { buildMesh } from '../core/mesh';
import { buildWedgeHeightMap, swapLayer, wedgeTable, type WedgeSettings } from '../core/calibration';
import { swapSteps } from '../core/swaps';
import { resolveStack } from '../core/stack';
import { layerTop } from '../core/units';
import { meshBus } from '../store/meshBus';
import { useAppStore } from '../store/useAppStore';
import { downloadBlob, exportBaseName } from './download';
import type { Filament } from '../core/filament';

const TEXT = { type: 'text/plain;charset=utf-8' };

/** Writes the current mesh out as a binary STL. No-op when nothing is built. */
export function exportStl(): boolean {
  const mesh = meshBus.get();
  if (!mesh || mesh.triangleCount === 0) return false;

  const { source, doc } = useAppStore.getState();
  const name = exportBaseName(source.name || doc.name);
  const buffer = writeBinaryStl(mesh, `HueForge ${name}`);

  downloadBlob(new Blob([buffer], { type: 'model/stl' }), `${name}.stl`);
  return true;
}

/** Writes the current mesh as 3MF, which carries units and a name. */
export function export3mf(): boolean {
  const mesh = meshBus.get();
  if (!mesh || mesh.triangleCount === 0) return false;

  const { source, doc } = useAppStore.getState();
  const name = exportBaseName(source.name || doc.name);
  // write3mf only reads the triangle soup, so the worker's result fits as is.
  const file = write3mf({ ...mesh, size: { x: 0, y: 0, z: mesh.maxHeight } }, name);

  downloadBlob(new Blob([file.buffer as ArrayBuffer], { type: 'model/3mf' }), `${name}.3mf`);
  return true;
}

/** Saves what the preview is showing as a PNG. */
export function exportPreviewPng(): boolean {
  const viewer = activeViewer.get();
  if (!viewer) return false;

  const { source, doc } = useAppStore.getState();
  const name = exportBaseName(source.name || doc.name);
  const dataUrl = viewer.snapshot();

  const binary = atob(dataUrl.split(',')[1] ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  downloadBlob(new Blob([bytes.buffer], { type: 'image/png' }), `${name}-nahled.png`);
  return true;
}

const mm = (value: number) => `${value.toFixed(2)} mm`;

/** The filament-change list for the current project. */
export function exportSwapInstructions(): boolean {
  const { doc, library, source, computed } = useAppStore.getState();
  const entries = resolveStack(doc.stack, library);
  if (entries.length === 0) return false;

  const t = i18n.t;
  const { layerHeight, firstLayerHeight } = doc.heights;
  const name = exportBaseName(source.name || doc.name);

  const lines = [
    t('swaps.title'),
    t('swaps.project', { name }),
    t('swaps.layerHeights', { layer: mm(layerHeight), first: mm(firstLayerHeight) }),
    t('swaps.model', { layers: computed.layers, height: mm(computed.maxHeight) }),
    '',
  ];

  for (const step of swapSteps(entries, layerHeight, firstLayerHeight)) {
    const filament = `${step.filament.brand} ${step.filament.name}`.trim();
    lines.push(
      step.isStart
        ? t('swaps.start', { layer: step.layer, filament, td: mm(step.filament.td) })
        : t('swaps.change', {
            layer: step.layer,
            height: mm(step.heightMm),
            filament,
            td: mm(step.filament.td),
          }),
    );
  }

  downloadBlob(new Blob([lines.join('\n')], TEXT), `${name}-vymeny.txt`);
  return true;
}

const wedgeName = (filament: Filament) =>
  exportBaseName(`${filament.brand} ${filament.name}`.trim(), 'filament');

/** The calibration wedge itself, as a printable STL. */
export function exportWedgeStl(settings: WedgeSettings, tested: Filament): void {
  const mesh = buildMesh(buildWedgeHeightMap(settings));
  const buffer = writeBinaryStl(mesh, `HueForge TD wedge`);
  downloadBlob(new Blob([buffer], { type: 'model/stl' }), `td-${wedgeName(tested)}.stl`);
}

/** How to print the wedge, and the table that turns a counted step into TD. */
export function exportWedgeInstructions(
  settings: WedgeSettings,
  tested: Filament,
  backing: Filament,
): void {
  const t = i18n.t;
  const label = (filament: Filament) => `${filament.brand} ${filament.name}`.trim();
  const swapAt = swapLayer(settings);

  const lines = [
    t('calibration.file.title'),
    t('calibration.file.tested', { filament: label(tested) }),
    t('calibration.file.backing', { filament: label(backing) }),
    t('swaps.layerHeights', {
      layer: mm(settings.layerHeight),
      first: mm(settings.firstLayerHeight),
    }),
    '',
    t('calibration.file.startLine', { filament: label(backing) }),
    t('calibration.file.swapLine', {
      layer: swapAt + 1,
      height: mm(layerTop(swapAt - 1, settings.layerHeight, settings.firstLayerHeight)),
      filament: label(tested),
    }),
    '',
    t('calibration.file.howTo'),
    '',
    t('calibration.file.tableHeader'),
  ];

  for (const row of wedgeTable(settings)) {
    lines.push(
      `${String(row.step).padStart(5)} | ${mm(row.thicknessMm).padStart(8)} | ${mm(row.totalMm).padStart(8)}`,
    );
  }

  downloadBlob(new Blob([lines.join('\n')], TEXT), `td-${wedgeName(tested)}.txt`);
}
