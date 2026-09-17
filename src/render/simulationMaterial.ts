import { DataTexture, LinearFilter, RGBAFormat, ShaderMaterial, UnsignedByteType, Vector3 } from 'three';
import type { Rgb } from '../core/color';

/**
 * Shades the model with the simulated print colour.
 *
 * The colour of a spot depends only on how many layers are under it, and the
 * stack is the same everywhere, so the whole simulation collapses to one
 * lookup per height. That table is built once per change on the CPU by
 * `simulateColumn` and uploaded as a texture; the shader turns each fragment's
 * height into a layer count and samples it.
 *
 * Running the layer loop per fragment instead would mean writing the model
 * twice — once in TypeScript for the colour core, once in GLSL — and the two
 * would drift. One implementation, sampled on the GPU, keeps the preview and
 * the colour core showing the same thing by construction.
 */

// The clipping chunks are what let the height-slice plane cut this material;
// a custom ShaderMaterial does not get them for free the way built-ins do.
const vertexShader = /* glsl */ `
varying float vHeight;
varying vec3 vNormal;

#include <clipping_planes_pars_vertex>

void main() {
  vHeight = position.z;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <clipping_planes_vertex>
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uLut;
uniform float uLayers;
uniform float uLayerHeight;
uniform float uFirstLayerHeight;
uniform vec3 uLightDirection;
uniform float uShading;

varying float vHeight;
varying vec3 vNormal;

#include <clipping_planes_pars_fragment>

void main() {
  #include <clipping_planes_fragment>

  // Height back to a layer index, matching layerCount() on the CPU.
  float layer = 1.0 + max(0.0, (vHeight - uFirstLayerHeight) / uLayerHeight);
  float index = clamp(layer - 0.5, 0.0, uLayers - 0.5);
  vec3 colour = texture2D(uLut, vec2(index / uLayers, 0.5)).rgb;

  // Just enough directional shading to read the relief, not enough to lie
  // about the colour.
  float lambert = max(dot(normalize(vNormal), normalize(uLightDirection)), 0.0);
  float shade = mix(1.0 - uShading, 1.0, lambert);

  gl_FragColor = vec4(colour * shade, 1.0);
}
`;

/** Packs simulated colours into a 1-pixel-tall texture, one texel per layer. */
export function buildLut(column: Rgb[]): DataTexture {
  const width = Math.max(1, column.length);
  const data = new Uint8Array(width * 4);

  for (let i = 0; i < width; i++) {
    const colour = column[i] ?? { r: 0, g: 0, b: 0 };
    data[i * 4] = Math.round(colour.r * 255);
    data[i * 4 + 1] = Math.round(colour.g * 255);
    data[i * 4 + 2] = Math.round(colour.b * 255);
    data[i * 4 + 3] = 255;
  }

  const texture = new DataTexture(data, width, 1, RGBAFormat, UnsignedByteType);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export interface SimulationUniforms {
  layerHeight: number;
  firstLayerHeight: number;
  /** How far the directional term may darken a face, 0 = flat. */
  shading: number;
}

export class SimulationMaterial extends ShaderMaterial {
  constructor({ layerHeight, firstLayerHeight, shading = 0.35 }: Partial<SimulationUniforms> = {}) {
    super({
      vertexShader,
      fragmentShader,
      clipping: true,
      uniforms: {
        uLut: { value: null },
        uLayers: { value: 1 },
        uLayerHeight: { value: layerHeight ?? 0.08 },
        uFirstLayerHeight: { value: firstLayerHeight ?? 0.16 },
        uLightDirection: { value: new Vector3(-0.4, -0.6, 0.8).normalize() },
        uShading: { value: shading },
      },
    });
  }

  setLut(column: Rgb[]): void {
    (this.uniforms.uLut.value as DataTexture | null)?.dispose();
    this.uniforms.uLut.value = buildLut(column);
    this.uniforms.uLayers.value = Math.max(1, column.length);
  }

  setLayerHeights(layerHeight: number, firstLayerHeight: number): void {
    this.uniforms.uLayerHeight.value = layerHeight;
    this.uniforms.uFirstLayerHeight.value = firstLayerHeight;
  }

  override dispose(): void {
    (this.uniforms.uLut.value as DataTexture | null)?.dispose();
    super.dispose();
  }
}
