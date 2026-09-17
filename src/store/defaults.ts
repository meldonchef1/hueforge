import { defaultBrightnessSettings } from '../core/brightness';
import { TRANSMISSION_AT_TD } from '../core/simulation';
import type {
  ComputedState,
  DocState,
  LayoutState,
  ModelGeometry,
  PanelId,
  SettingsState,
  SourceState,
  StatusState,
  ViewState,
} from './types';

export const PANEL_IDS: readonly PanelId[] = [
  'filamentLibrary',
  'preview',
  'colorCore',
  'heightSlice',
  'sourceImage',
  'layerSliders',
  'modelGeometry',
] as const;

export const defaultGeometry = (): ModelGeometry => ({
  widthMm: 100,
  heightMm: 100,
  lockAspect: true,
  detailMm: 0.3,
  border: { enabled: false, width: 3, depth: 0.4 },
  baseThickness: 0.16,
  maxDepth: 2.56,
  dynamicDepth: true,
  cropToAlpha: true,
  brightness: defaultBrightnessSettings(),
});

export const defaultDoc = (): DocState => ({
  name: 'untitled',
  mode: 'filament',
  heights: {
    layerHeight: 0.08,
    firstLayerHeight: 0.16,
    heightStep: 0.04,
  },
  geometry: defaultGeometry(),
  stack: [],
  spotFix: [],
});

export const defaultSource = (): SourceState => ({ pixels: null, name: '' });

export const defaultComputed = (): ComputedState => ({
  triangles: 0,
  maxHeight: 0,
  layers: 0,
  computing: false,
  error: null,
});

export const defaultView = (): ViewState => ({
  light: 'neutral',
  lightIntensity: 1,
  wireframe: false,
  compare: 'off',
  brushActive: false,
  brushRadius: 0.06,
  brushStrength: 0.15,
  compareAmount: 0.5,
  sliceHeight: 1,
  cameraResetNonce: 0,
});

export const defaultSettings = (): SettingsState => ({
  theme: 'dark',
  language: 'cs',
  units: 'mm',
  defaultPrinter: '',
  transmissionAtTd: TRANSMISSION_AT_TD,
});

export const defaultLayout = (): LayoutState => ({
  serialized: null,
  visible: Object.fromEntries(PANEL_IDS.map((id) => [id, true])) as Record<PanelId, boolean>,
});

export const defaultStatus = (): StatusState => ({
  saveState: 'saved',
  fps: 0,
  warnings: [],
});
