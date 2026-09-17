import type { Mesh } from './mesh';

/**
 * Binary STL: an 80-byte header, a triangle count, then 50 bytes per triangle
 * (a normal, three vertices, and two bytes almost every tool ignores).
 */

const HEADER_BYTES = 80;
const COUNT_BYTES = 4;
const TRIANGLE_BYTES = 50;

export const stlByteLength = (triangleCount: number) =>
  HEADER_BYTES + COUNT_BYTES + triangleCount * TRIANGLE_BYTES;

/** Only the triangle soup is needed, so a mesh straight from the worker fits. */
export type StlSource = Pick<Mesh, 'positions' | 'normals' | 'triangleCount'>;

export function writeBinaryStl(mesh: StlSource, header = 'HueForge'): ArrayBuffer {
  const buffer = new ArrayBuffer(stlByteLength(mesh.triangleCount));
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // An ASCII header must not start with "solid", or readers guess the wrong format.
  const text = header.slice(0, HEADER_BYTES);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0x7f;

  view.setUint32(HEADER_BYTES, mesh.triangleCount, true);

  const { positions, normals } = mesh;
  let offset = HEADER_BYTES + COUNT_BYTES;

  for (let t = 0; t < mesh.triangleCount; t++) {
    const i = t * 9;

    view.setFloat32(offset, normals[i], true);
    view.setFloat32(offset + 4, normals[i + 1], true);
    view.setFloat32(offset + 8, normals[i + 2], true);
    offset += 12;

    for (let v = 0; v < 9; v += 3) {
      view.setFloat32(offset, positions[i + v], true);
      view.setFloat32(offset + 4, positions[i + v + 1], true);
      view.setFloat32(offset + 8, positions[i + v + 2], true);
      offset += 12;
    }

    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return buffer;
}

export interface ParsedStl {
  header: string;
  triangleCount: number;
  triangles: { normal: number[]; vertices: number[][] }[];
}

/** Reads back a binary STL. Used by the tests, and handy for importing later. */
export function readBinaryStl(buffer: ArrayBuffer): ParsedStl {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer, 0, HEADER_BYTES);
  const header = new TextDecoder().decode(bytes).replace(/\0+$/, '');
  const triangleCount = view.getUint32(HEADER_BYTES, true);

  const triangles: ParsedStl['triangles'] = [];
  let offset = HEADER_BYTES + COUNT_BYTES;

  for (let t = 0; t < triangleCount; t++) {
    const normal = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    offset += 12;

    const vertices: number[][] = [];
    for (let v = 0; v < 3; v++) {
      vertices.push([
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
      ]);
      offset += 12;
    }

    offset += 2;
    triangles.push({ normal, vertices });
  }

  return { header, triangleCount, triangles };
}
