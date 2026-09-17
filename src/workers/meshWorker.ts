/// <reference lib="webworker" />
import { applyBrightness, type BrightnessSettings } from '../core/brightness';
import { buildHeightMap, type BorderSettings } from '../core/heightmap';
import { buildMesh } from '../core/mesh';

/**
 * The image is sent once and kept here; every later change sends parameters
 * only. Shipping several megabytes of pixels per slider tick would cost more
 * than the whole computation.
 */
export interface LoadImageMessage {
  type: 'image';
  pixels: ArrayBuffer;
  width: number;
  height: number;
}

export interface BuildMessage {
  type: 'build';
  /** Echoed back, so a late reply from a superseded run can be dropped. */
  id: number;
  widthMm: number;
  heightMm: number;
  detailMm: number;
  baseThickness: number;
  maxDepth: number;
  layerHeight: number;
  firstLayerHeight: number;
  border: BorderSettings;
  brightness: BrightnessSettings;
}

export type WorkerRequest = LoadImageMessage | BuildMessage;

export interface BuildResult {
  type: 'result';
  id: number;
  positions: Float32Array;
  normals: Float32Array;
  triangleCount: number;
  maxHeight: number;
  layers: number;
  /** Height per sample, for the eyedropper and, later, the colour core. */
  heights: Float32Array;
  cols: number;
  rows: number;
}

export interface BuildFailure {
  type: 'error';
  id: number;
  message: string;
}

export type WorkerResponse = BuildResult | BuildFailure;

let image: { pixels: Uint8ClampedArray; width: number; height: number } | null = null;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'image') {
    image = {
      pixels: new Uint8ClampedArray(request.pixels),
      width: request.width,
      height: request.height,
    };
    return;
  }

  if (!image) return;

  try {
    const field = applyBrightness(image.pixels, image.width, image.height, request.brightness);

    const map = buildHeightMap(field, {
      widthMm: request.widthMm,
      heightMm: request.heightMm,
      detailMm: request.detailMm,
      baseThickness: request.baseThickness,
      maxDepth: request.maxDepth,
      layerHeight: request.layerHeight,
      firstLayerHeight: request.firstLayerHeight,
      border: request.border,
    });

    const mesh = buildMesh(map);

    const result: BuildResult = {
      type: 'result',
      id: request.id,
      positions: mesh.positions,
      normals: mesh.normals,
      triangleCount: mesh.triangleCount,
      maxHeight: map.maxHeight,
      layers: map.layers,
      heights: map.data,
      cols: map.cols,
      rows: map.rows,
    };

    // Hand the buffers over rather than copying them; they run to tens of MB.
    self.postMessage(result, {
      transfer: [result.positions.buffer, result.normals.buffer, result.heights.buffer],
    });
  } catch (cause) {
    const failure: BuildFailure = {
      type: 'error',
      id: request.id,
      message: cause instanceof Error ? cause.message : String(cause),
    };
    self.postMessage(failure);
  }
};
