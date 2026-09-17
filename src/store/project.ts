import { defaultDoc, defaultLayout, PANEL_IDS } from './defaults';
import type { DocState, LayoutState, PanelId } from './types';

/**
 * A project is one file: the image, the settings, the stack and the panel
 * layout. Reading it is deliberately forgiving — a file from an older build
 * should open with whatever it does carry and defaults for the rest, rather
 * than being refused wholesale.
 */

export const PROJECT_VERSION = 1;

export interface ProjectImage {
  name: string;
  /** PNG data URL; big, but it keeps the project to a single file. */
  dataUrl: string;
}

export interface ProjectFile {
  app: 'hueforge';
  version: number;
  doc: DocState;
  layout: LayoutState;
  image: ProjectImage | null;
}

export function buildProject(
  doc: DocState,
  layout: LayoutState,
  image: ProjectImage | null,
): ProjectFile {
  return { app: 'hueforge', version: PROJECT_VERSION, doc, layout, image };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

interface RawStroke {
  points: unknown[];
  radius: number;
  strength: number;
}

const isStroke = (value: unknown): value is RawStroke =>
  isRecord(value) &&
  Array.isArray(value.points) &&
  typeof value.radius === 'number' &&
  Number.isFinite(value.radius) &&
  typeof value.strength === 'number' &&
  Number.isFinite(value.strength);

function mergeDoc(input: unknown): DocState {
  const base = defaultDoc();
  if (!isRecord(input)) return base;

  const heights = isRecord(input.heights) ? input.heights : {};
  const geometry = isRecord(input.geometry) ? input.geometry : {};
  const border = isRecord(geometry.border) ? geometry.border : {};
  const brightness = isRecord(geometry.brightness) ? geometry.brightness : {};

  return {
    name: typeof input.name === 'string' ? input.name : base.name,
    mode: input.mode === 'lithophane' ? 'lithophane' : 'filament',
    heights: {
      layerHeight: num(heights.layerHeight, base.heights.layerHeight),
      firstLayerHeight: num(heights.firstLayerHeight, base.heights.firstLayerHeight),
      heightStep: num(heights.heightStep, base.heights.heightStep),
    },
    geometry: {
      widthMm: num(geometry.widthMm, base.geometry.widthMm),
      heightMm: num(geometry.heightMm, base.geometry.heightMm),
      lockAspect: bool(geometry.lockAspect, base.geometry.lockAspect),
      detailMm: num(geometry.detailMm, base.geometry.detailMm),
      border: {
        enabled: bool(border.enabled, base.geometry.border.enabled),
        width: num(border.width, base.geometry.border.width),
        depth: num(border.depth, base.geometry.border.depth),
      },
      baseThickness: num(geometry.baseThickness, base.geometry.baseThickness),
      maxDepth: num(geometry.maxDepth, base.geometry.maxDepth),
      dynamicDepth: bool(geometry.dynamicDepth, base.geometry.dynamicDepth),
      cropToAlpha: bool(geometry.cropToAlpha, base.geometry.cropToAlpha),
      brightness: {
        model:
          brightness.model === 'rec601' ||
          brightness.model === 'average' ||
          brightness.model === 'perceptual'
            ? brightness.model
            : 'rec709',
        srgb: bool(brightness.srgb, base.geometry.brightness.srgb),
        compensation: num(brightness.compensation, base.geometry.brightness.compensation),
        adjustment: num(brightness.adjustment, base.geometry.brightness.adjustment),
        smoothing: num(brightness.smoothing, base.geometry.brightness.smoothing),
        invert: bool(brightness.invert, base.geometry.brightness.invert),
        fullRange: bool(brightness.fullRange, base.geometry.brightness.fullRange),
      },
    },
    spotFix: Array.isArray(input.spotFix)
      ? input.spotFix.filter(isStroke).map((stroke) => ({
          points: stroke.points.filter(
            (point): point is { u: number; v: number } =>
              isRecord(point) && typeof point.u === 'number' && typeof point.v === 'number',
          ),
          radius: stroke.radius,
          strength: stroke.strength,
        }))
      : [],
    stack: Array.isArray(input.stack)
      ? input.stack
          .filter(
            (slot): slot is { filamentId: string; startLayer: number } =>
              isRecord(slot) &&
              typeof slot.filamentId === 'string' &&
              typeof slot.startLayer === 'number',
          )
          .map((slot) => ({ filamentId: slot.filamentId, startLayer: Math.max(0, Math.round(slot.startLayer)) }))
      : [],
  };
}

function mergeLayout(input: unknown): LayoutState {
  const base = defaultLayout();
  if (!isRecord(input)) return base;

  const visible = { ...base.visible };
  if (isRecord(input.visible)) {
    for (const id of PANEL_IDS) {
      const value = (input.visible as Record<string, unknown>)[id];
      if (typeof value === 'boolean') visible[id as PanelId] = value;
    }
  }

  return {
    serialized: isRecord(input.serialized) ? (input.serialized as object) : null,
    visible,
  };
}

/** Reads a project file, or null when it is not one at all. */
export function parseProject(input: unknown): ProjectFile | null {
  if (!isRecord(input) || input.app !== 'hueforge') return null;

  const image = isRecord(input.image) ? input.image : null;
  const dataUrl = image && typeof image.dataUrl === 'string' ? image.dataUrl : null;

  return {
    app: 'hueforge',
    version: num(input.version, PROJECT_VERSION),
    doc: mergeDoc(input.doc),
    layout: mergeLayout(input.layout),
    image:
      dataUrl && dataUrl.startsWith('data:image/')
        ? { name: typeof image?.name === 'string' ? image.name : 'image', dataUrl }
        : null,
  };
}
