import type { BrightnessSettings } from '../core/brightness';
import type { BorderSettings } from '../core/heightmap';
import type { StackSlot } from '../core/stack';

export type { BrightnessSettings, BorderSettings, StackSlot };

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

/** Printed size and shape of the model. */
export interface ModelGeometry {
  widthMm: number;
  heightMm: number;
  /** Keep width and height in the source image's proportion. */
  lockAspect: boolean;
  /** Distance between mesh samples in mm — the finest detail the mesh can hold. */
  detailMm: number;
  border: BorderSettings;
  /** Solid slab under the relief, in mm. */
  baseThickness: number;
  /** Height of the brightest part of the image, in mm. */
  maxDepth: number;
  /** Snap max depth to a whole number of layers. */
  dynamicDepth: boolean;
  /**
   * Follow the image's transparent edges instead of filling a rectangle.
   * Has no effect on an image without an alpha channel.
   */
  cropToAlpha: boolean;
  brightness: BrightnessSettings;
}

/**
 * The undoable document — everything that belongs to the project and that
 * Ctrl+Z is expected to walk back through.
 */
export interface DocState {
  name: string;
  mode: PrintMode;
  heights: LayerHeights;
  geometry: ModelGeometry;
  /** Ordered by startLayer, bottom first. */
  stack: StackSlot[];
}

/** The loaded image. Pixels are too big for history or localStorage, so this
 * lives outside the document and is not undoable. */
export interface SourceState {
  pixels: ImageData | null;
  name: string;
}

/** Latest result of the mesh pipeline. Derived, so never persisted. */
export interface ComputedState {
  triangles: number;
  maxHeight: number;
  layers: number;
  /** True while the worker is busy. */
  computing: boolean;
  error: string | null;
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
  fps: number;
  warnings: string[];
}

/** Above this the browser starts to struggle, so the status bar flags it. */
export const TRIANGLE_LIMIT = 2_000_000;
