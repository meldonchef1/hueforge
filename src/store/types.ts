export type PanelId =
  | 'filamentLibrary'
  | 'preview'
  | 'colorCore'
  | 'heightSlice'
  | 'sourceImage'
  | 'layerSliders'
  | 'modelGeometry';

export type Theme = 'dark' | 'light';
export type Language = 'cs' | 'en';
export type Units = 'mm' | 'in';

/** Print mode: colour on a lit-from-front model, or a backlit lithophane. */
export type PrintMode = 'filament' | 'lithophane';

/** Backlight colour temperature used by the preview simulation. */
export type LightKind = 'warm' | 'neutral' | 'daylight';

export const LIGHT_TEMPERATURES: Record<LightKind, number> = {
  warm: 2700,
  neutral: 4000,
  daylight: 6500,
};

export type SaveState = 'saved' | 'dirty' | 'saving';

/** Layer geometry in millimetres. Everything in the stack is a multiple of these. */
export interface LayerHeights {
  /** Height of one printed layer. */
  layerHeight: number;
  /** Height of the very first layer, often thicker for bed adhesion. */
  firstLayerHeight: number;
  /** Step used when nudging heights with arrows or the mouse wheel. */
  heightStep: number;
}

/**
 * The undoable document — everything that belongs to the project and that
 * Ctrl+Z is expected to walk back through.
 */
export interface DocState {
  name: string;
  mode: PrintMode;
  heights: LayerHeights;
}

/** Preview-only state. Not part of the project, so not undoable. */
export interface ViewState {
  light: LightKind;
  lightIntensity: number;
  wireframe: boolean;
  /** Vertical slice through the stack, 0 = base only, 1 = whole model. */
  sliceHeight: number;
  /** Bumped to ask the renderer for a camera reset. */
  cameraResetNonce: number;
}

export interface SettingsState {
  theme: Theme;
  language: Language;
  units: Units;
  defaultPrinter: string;
}

export interface LayoutState {
  /** Serialised dockview layout, or null to fall back to the default. */
  serialized: object | null;
  visible: Record<PanelId, boolean>;
}

export interface StatusState {
  saveState: SaveState;
  meshHeight: number;
  maxMeshHeight: number;
  triangles: number;
  triangleLimit: number;
  fps: number;
  warnings: string[];
}
