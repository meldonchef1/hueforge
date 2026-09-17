import type { GrayField } from './brightness';

/**
 * Local touch-ups to the height map.
 *
 * Strokes are stored as the points the user dragged through, not as a painted
 * bitmap. A bitmap the size of the image would be megabytes in every undo step;
 * a handful of coordinates costs nothing and replays exactly.
 */

export interface SpotPoint {
  /** Position in the image, 0..1. */
  u: number;
  v: number;
}

export interface SpotStroke {
  points: SpotPoint[];
  /** Brush radius as a fraction of the image's smaller side. */
  radius: number;
  /** Positive lifts the surface, negative lowers it. Roughly -1..1. */
  strength: number;
}

/** Smooth falloff from the centre of the brush to its edge. */
const falloff = (distance: number, radius: number): number => {
  if (distance >= radius) return 0;
  const t = 1 - distance / radius;
  // Smoothstep, so repeated strokes build up without a hard rim.
  return t * t * (3 - 2 * t);
};

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Applies strokes to a brightness field, in place. Radii are relative to the
 * image, so a touch-up survives a change of print size or mesh detail.
 */
export function applyStrokes(field: GrayField, strokes: SpotStroke[]): void {
  if (strokes.length === 0) return;

  const { width, height, data } = field;
  const shorterSide = Math.min(width, height);

  for (const stroke of strokes) {
    const radiusPx = Math.max(1, stroke.radius * shorterSide);
    const radiusSquared = radiusPx * radiusPx;

    for (const point of stroke.points) {
      const cx = point.u * (width - 1);
      const cy = point.v * (height - 1);

      const minX = Math.max(0, Math.floor(cx - radiusPx));
      const maxX = Math.min(width - 1, Math.ceil(cx + radiusPx));
      const minY = Math.max(0, Math.floor(cy - radiusPx));
      const maxY = Math.min(height - 1, Math.ceil(cy + radiusPx));

      for (let y = minY; y <= maxY; y++) {
        const dy = y - cy;
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= radiusSquared) continue;

          const index = y * width + x;
          const weight = falloff(Math.sqrt(distanceSquared), radiusPx);
          data[index] = clamp01(data[index] + stroke.strength * weight);
        }
      }
    }
  }
}

/** Points along a drag, thinned so a slow drag does not store hundreds of them. */
export function appendPoint(points: SpotPoint[], point: SpotPoint, minGap: number): SpotPoint[] {
  const last = points.at(-1);
  if (last && Math.hypot(point.u - last.u, point.v - last.v) < minGap) return points;
  return [...points, point];
}
