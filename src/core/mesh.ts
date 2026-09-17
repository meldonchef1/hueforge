import type { HeightMap } from './heightmap';

/**
 * Builds a watertight solid from a height map: the relief on top, four walls
 * down to the bed, and a flat floor. Triangles are stored unindexed because
 * that is what both STL and a non-indexed BufferGeometry want.
 *
 * Axes are the printer's: X right, Y back, Z up, with the model centred on XY
 * and sitting on Z = 0.
 */
export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  triangleCount: number;
  /** Bounding box, in mm. */
  size: { x: number; y: number; z: number };
}

export function triangleCountFor(cols: number, rows: number): number {
  const top = 2 * (cols - 1) * (rows - 1);
  const walls = 4 * (cols - 1) + 4 * (rows - 1);
  // The floor fans out from its centre so its edges match the wall segments
  // one for one. Two big triangles would leave T-junctions along every wall.
  const floor = 2 * (cols - 1) + 2 * (rows - 1);
  return top + walls + floor;
}

class MeshBuilder {
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private offset = 0;

  constructor(triangles: number) {
    this.positions = new Float32Array(triangles * 9);
    this.normals = new Float32Array(triangles * 9);
  }

  /** Vertices must be counter-clockwise seen from outside, so the normal points out. */
  add(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ): void {
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      nx /= length;
      ny /= length;
      nz /= length;
    }

    const p = this.offset;
    this.positions.set([ax, ay, az, bx, by, bz, cx, cy, cz], p);
    this.normals.set([nx, ny, nz, nx, ny, nz, nx, ny, nz], p);
    this.offset = p + 9;
  }

  finish(size: Mesh['size']): Mesh {
    return {
      positions: this.positions,
      normals: this.normals,
      triangleCount: this.offset / 9,
      size,
    };
  }
}

export function buildMesh(map: HeightMap): Mesh {
  const { cols, rows, data, cellX, cellY, widthMm, heightMm } = map;
  const builder = new MeshBuilder(triangleCountFor(cols, rows));

  const halfW = widthMm / 2;
  const halfH = heightMm / 2;
  const xAt = (col: number) => col * cellX - halfW;
  // Row 0 is the top of the image, which belongs at the back of the model.
  const yAt = (row: number) => halfH - row * cellY;
  const hAt = (col: number, row: number) => data[row * cols + col];

  // Relief.
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const x0 = xAt(col);
      const x1 = xAt(col + 1);
      const y0 = yAt(row);
      const y1 = yAt(row + 1);
      const h00 = hAt(col, row);
      const h10 = hAt(col + 1, row);
      const h01 = hAt(col, row + 1);
      const h11 = hAt(col + 1, row + 1);

      builder.add(x0, y0, h00, x0, y1, h01, x1, y1, h11);
      builder.add(x0, y0, h00, x1, y1, h11, x1, y0, h10);
    }
  }

  const left = xAt(0);
  const right = xAt(cols - 1);
  const back = yAt(0);
  const front = yAt(rows - 1);

  // Back wall (+Y) and front wall (-Y).
  for (let col = 0; col < cols - 1; col++) {
    const x0 = xAt(col);
    const x1 = xAt(col + 1);

    const hb0 = hAt(col, 0);
    const hb1 = hAt(col + 1, 0);
    builder.add(x0, back, 0, x1, back, hb1, x1, back, 0);
    builder.add(x0, back, 0, x0, back, hb0, x1, back, hb1);

    const hf0 = hAt(col, rows - 1);
    const hf1 = hAt(col + 1, rows - 1);
    builder.add(x0, front, 0, x1, front, 0, x1, front, hf1);
    builder.add(x0, front, 0, x1, front, hf1, x0, front, hf0);
  }

  // Left wall (-X) and right wall (+X).
  for (let row = 0; row < rows - 1; row++) {
    const y0 = yAt(row);
    const y1 = yAt(row + 1);

    const hl0 = hAt(0, row);
    const hl1 = hAt(0, row + 1);
    builder.add(left, y0, 0, left, y1, 0, left, y1, hl1);
    builder.add(left, y0, 0, left, y1, hl1, left, y0, hl0);

    const hr0 = hAt(cols - 1, row);
    const hr1 = hAt(cols - 1, row + 1);
    builder.add(right, y0, 0, right, y1, hr1, right, y1, 0);
    builder.add(right, y0, 0, right, y0, hr0, right, y1, hr1);
  }

  // Floor: a fan from the centre over the same segments the walls stand on.
  const perimeter: [number, number][] = [];
  for (let col = 0; col < cols - 1; col++) perimeter.push([xAt(col), front]);
  for (let row = rows - 1; row > 0; row--) perimeter.push([right, yAt(row)]);
  for (let col = cols - 1; col > 0; col--) perimeter.push([xAt(col), back]);
  for (let row = 0; row < rows - 1; row++) perimeter.push([left, yAt(row)]);

  for (let i = 0; i < perimeter.length; i++) {
    const [ax, ay] = perimeter[i];
    const [bx, by] = perimeter[(i + 1) % perimeter.length];
    // Wound backwards against the top face, so the floor's normal points down.
    builder.add(0, 0, 0, bx, by, 0, ax, ay, 0);
  }

  return builder.finish({ x: widthMm, y: heightMm, z: map.maxHeight });
}

/**
 * Signed volume of the triangle soup, in mm³. A watertight mesh whose normals
 * all face outwards gives a positive value; a leak or a flipped face does not.
 */
export function signedVolume(mesh: Mesh): number {
  const p = mesh.positions;
  let total = 0;
  for (let i = 0; i < mesh.triangleCount * 9; i += 9) {
    const ax = p[i], ay = p[i + 1], az = p[i + 2];
    const bx = p[i + 3], by = p[i + 4], bz = p[i + 5];
    const cx = p[i + 6], cy = p[i + 7], cz = p[i + 8];
    total +=
      ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return total / 6;
}
