import { parseHex, type Rgb } from './color';
import type { Filament } from './filament';

/**
 * Stacks printed layers into the colour you actually see.
 *
 * The model is deliberately simple and its one free constant is named rather
 * than buried: real prints are what decide whether it is right, and calibration
 * (milestone 4) is where it gets corrected. Both the CPU path here and the GPU
 * shader must agree, so the maths lives in one place and is mirrored in GLSL.
 */

/**
 * Fraction of light still getting through at exactly TD thickness. Fixes the
 * curve's steepness — the one number calibration will want to argue with.
 */
export const TRANSMISSION_AT_TD = 0.1;

/**
 * How much light passes through `thickness` mm of a filament with this TD.
 * `atTd` is the model's one free constant — calibration against a real print
 * is what decides it, so it is a parameter rather than a buried number.
 */
export function transmission(thickness: number, td: number, atTd = TRANSMISSION_AT_TD): number {
  if (td <= 0) return 0; // TD 0 means fully opaque, however thin the layer
  if (thickness <= 0) return 1;
  const falloff = Math.log(1 / Math.min(0.99, Math.max(0.001, atTd)));
  return Math.exp((-thickness * falloff) / td);
}

export interface StackEntry {
  filament: Filament;
  /** First printed layer this filament covers, 0-based. */
  startLayer: number;
}

export interface SimulationOptions {
  layerHeight: number;
  firstLayerHeight: number;
  light: Rgb;
  intensity: number;
  lithophane: boolean;
  /** Light still passing at exactly TD thickness; defaults to the model constant. */
  transmissionAtTd?: number;
}

/** Thickness of one layer; the first is usually thicker. */
export const layerThickness = (index: number, layerHeight: number, firstLayerHeight: number) =>
  index === 0 ? firstLayerHeight : layerHeight;

/** The filament covering a given layer — the last one that starts at or below it. */
export function filamentAtLayer(stack: StackEntry[], layer: number): Filament | null {
  let found: Filament | null = null;
  for (const entry of stack) {
    if (entry.startLayer <= layer) found = entry.filament;
    else break;
  }
  return found ?? stack[0]?.filament ?? null;
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

const colourOf = (filament: Filament): Rgb => parseHex(filament.color) ?? BLACK;

/**
 * Colour of a spot that is `layers` layers tall.
 *
 * Filament painting looks at light bouncing back off the stack, so upper layers
 * hide lower ones. A lithophane is lit from behind, so every layer dims and
 * tints what passes through it.
 */
export function simulateLayers(
  layers: number,
  stack: StackEntry[],
  options: SimulationOptions,
): Rgb {
  const { layerHeight, firstLayerHeight, light, intensity, lithophane } = options;
  const atTd = options.transmissionAtTd ?? TRANSMISSION_AT_TD;
  if (layers <= 0 || stack.length === 0) return BLACK;

  if (lithophane) {
    let r = light.r * intensity;
    let g = light.g * intensity;
    let b = light.b * intensity;

    for (let index = 0; index < layers; index++) {
      const filament = filamentAtLayer(stack, index);
      if (!filament) continue;
      const colour = colourOf(filament);
      const t = transmission(layerThickness(index, layerHeight, firstLayerHeight), filament.td, atTd);
      // What gets through is dimmed by t and tinted by however much was absorbed.
      const tint = 1 - t;
      r *= t * (1 - tint + tint * colour.r);
      g *= t * (1 - tint + tint * colour.g);
      b *= t * (1 - tint + tint * colour.b);
    }

    return { r: clamp01(r), g: clamp01(g), b: clamp01(b) };
  }

  const bottom = colourOf(filamentAtLayer(stack, 0) ?? stack[0].filament);
  let r = bottom.r;
  let g = bottom.g;
  let b = bottom.b;

  for (let index = 0; index < layers; index++) {
    const filament = filamentAtLayer(stack, index);
    if (!filament) continue;
    const colour = colourOf(filament);
    const t = transmission(layerThickness(index, layerHeight, firstLayerHeight), filament.td, atTd);
    // Whatever this layer does not let through is replaced by its own colour.
    r = colour.r * (1 - t) + r * t;
    g = colour.g * (1 - t) + g * t;
    b = colour.b * (1 - t) + b * t;
  }

  return {
    r: clamp01(r * light.r * intensity),
    g: clamp01(g * light.g * intensity),
    b: clamp01(b * light.b * intensity),
  };
}

/**
 * Colour for every height from 1 layer up to `maxLayers` — what the colour core
 * draws, and the lookup table the shader samples.
 */
export function simulateColumn(
  maxLayers: number,
  stack: StackEntry[],
  options: SimulationOptions,
): Rgb[] {
  const column: Rgb[] = [];
  for (let layers = 1; layers <= maxLayers; layers++) {
    column.push(simulateLayers(layers, stack, options));
  }
  return column;
}
