import type { DocState, LayoutState, PanelId, SettingsState, StatusState, ViewState } from './types';

export const PANEL_IDS: readonly PanelId[] = [
  'filamentLibrary',
  'preview',
  'colorCore',
  'heightSlice',
  'sourceImage',
  'layerSliders',
  'modelGeometry',
] as const;

export const defaultDoc = (): DocState => ({
  name: 'untitled',
  mode: 'filament',
  heights: {
    layerHeight: 0.08,
    firstLayerHeight: 0.16,
    heightStep: 0.04,
  },
});

export const defaultView = (): ViewState => ({
  light: 'neutral',
  lightIntensity: 1,
  wireframe: false,
  sliceHeight: 1,
  cameraResetNonce: 0,
});

export const defaultSettings = (): SettingsState => ({
  theme: 'dark',
  language: 'cs',
  units: 'mm',
  defaultPrinter: '',
});

export const defaultLayout = (): LayoutState => ({
  serialized: null,
  visible: Object.fromEntries(PANEL_IDS.map((id) => [id, true])) as Record<PanelId, boolean>,
});

export const defaultStatus = (): StatusState => ({
  saveState: 'saved',
  meshHeight: 0,
  maxMeshHeight: 0,
  triangles: 0,
  triangleLimit: 2_000_000,
  fps: 0,
  warnings: [],
});
