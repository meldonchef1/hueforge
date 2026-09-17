import type { HeightMap } from './heightmap';

/**
 * Builds a watertight solid from a height map: the relief on top, walls down to
 * the bed, and a floor. Triangles are stored unindexed because that is what
 * both STL and a non-indexed BufferGeometry want.
 *
 * Where the source image was transparent the model has no material at all, so
 * the outline follows the picture instead of boxing it into a rectangle. Walls
 * then go up wherever a filled cell meets an empty one, inside holes included.
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

/** Triangles for a rectangle with no holes, where the floor can be one fan. */
export function triangleCountFor(cols: number, rows: number): number {
  const top = 2 * (cols - 1) * (rows - 1);
  const walls = 4 * (cols - 1) + 4 * (rows - 1);
  // The floor fans out from its centre so its edges match the wall segments one
  // for one. Two big triangles would leave T-junctions along every wall.
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
    const used = this.offset;
    return {
      // Trim: the budget is an upper bound when the outline has holes.
      positions: used === this.positions.length ? this.positions : this.positions.subarray(0, used),
      normals: used === this.normals.length ? this.normals : this.normals.subarray(0, used),
      triangleCount: used / 9,
      size,
    };
  }
}

export function buildMesh(map: HeightMap): Mesh {
  const { cols, rows, data, cellX, cellY, widthMm, heightMm, solid, fullySolid } = map;

  const halfW = widthMm / 2;
  const halfH = heightMm / 2;
  const xAt = (col: number) => col * cellX - halfW;
  // Row 0 is the top of the image, which belongs at the back of the model.
  const yAt = (row: number) => halfH - row * cellY;
  const hAt = (col: number, row: number) => data[row * cols + col];

  /** A cell carries material only when all four of its corners do. */
  const filled = (col: number, row: number): boolean => {
    if (col < 0 || row < 0 || col >= cols - 1 || row >= rows - 1) return false;
    const top = row * cols + col;
    const bottom = top + cols;
    return (
      solid[top] === 1 && solid[top + 1] === 1 && solid[bottom] === 1 && solid[bottom + 1] === 1
    );
  };

  if (fullySolid) return buildFullMesh(map, xAt, yAt, hAt);

  // Count first: with holes the triangle total is not a formula.
  let cells = 0;
  let wallEdges = 0;
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      if (!filled(col, row)) continue;
      cells++;
      if (!filled(col - 1, row)) wallEdges++;
      if (!filled(col + 1, row)) wallEdges++;
      if (!filled(col, row - 1)) wallEdges++;
      if (!filled(col, row + 1)) wallEdges++;
    }
  }

  // Top and floor are 2 triangles per cell; each exposed edge is a 2-triangle wall.
  const builder = new MeshBuilder(4 * cells + 2 * wallEdges);
  let maxHeight = 0;

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      if (!filled(col, row)) continue;

      const x0 = xAt(col);
      const x1 = xAt(col + 1);
      const yTop = yAt(row);
      const yBot = yAt(row + 1);
      const h00 = hAt(col, row);
      const h10 = hAt(col + 1, row);
      const h01 = hAt(col, row + 1);
      const h11 = hAt(col + 1, row + 1);
      maxHeight = Math.max(maxHeight, h00, h10, h01, h11);

      // Relief.
      builder.add(x0, yTop, h00, x0, yBot, h01, x1, yBot, h11);
      builder.add(x0, yTop, h00, x1, yBot, h11, x1, yTop, h10);

      // Floor, facing down.
      builder.add(x0, yTop, 0, x1, yBot, 0, x0, yBot, 0);
      builder.add(x0, yTop, 0, x1, yTop, 0, x1, yBot, 0);

      if (!filled(col - 1, row)) {
        builder.add(x0, yTop, 0, x0, yBot, 0, x0, yBot, h01);
        builder.add(x0, yTop, 0, x0, yBot, h01, x0, yTop, h00);
      }
      if (!filled(col + 1, row)) {
        builder.add(x1, yTop, 0, x1, yBot, h11, x1, yBot, 0);
        builder.add(x1, yTop, 0, x1, yTop, h10, x1, yBot, h11);
      }
      if (!filled(col, row - 1)) {
        builder.add(x0, yTop, 0, x1, yTop, h10, x1, yTop, 0);
        builder.add(x0, yTop, 0, x0, yTop, h00, x1, yTop, h10);
      }
      if (!filled(col, row + 1)) {
        builder.add(x0, yBot, 0, x1, yBot, 0, x1, yBot, h11);
        builder.add(x0, yBot, 0, x1, yBot, h11, x0, yBot, h01);
      }
    }
  }

  return builder.finish({ x: widthMm, y: heightMm, z: maxHeight });
}

/** The rectangular case, where the floor collapses to a single fan. */
function buildFullMesh(
  map: HeightMap,
  xAt: (col: number) => number,
  yAt: (row: number) => number,
  hAt: (col: number, row: number) => number,
): Mesh {
  const { cols, rows, widthMm, heightMm } = map;
  const builder = new MeshBuilder(triangleCountFor(cols, rows));

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const x0 = xAt(col);
      const x1 = xAt(col + 1);
      const y0 = yAt(row);
      const y1 = yAt(row + 1);

      builder.add(x0, y0, hAt(col, row), x0, y1, hAt(col, row + 1), x1, y1, hAt(col + 1, row + 1));
      builder.add(x0, y0, hAt(col, row), x1, y1, hAt(col + 1, row + 1), x1, y0, hAt(col + 1, row));
    }
  }

  const left = xAt(0);
  const right = xAt(cols - 1);
  const back = yAt(0);
  const front = yAt(rows - 1);

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
