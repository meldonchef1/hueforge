export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Colour of a black-body radiator at a given temperature, 0..1 per channel.
 * Tanner Helland's approximation — close enough for 1000–40000 K, and what the
 * preview needs to show how warm or cold a backlight makes the print look.
 */
export function kelvinToRgb(kelvin: number): Rgb {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;

  const red =
    t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);

  const green =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);

  const blue =
    t >= 66
      ? 255
      : t <= 19
        ? 0
        : 138.5177312231 * Math.log(t - 10) - 305.0447927307;

  const clamp = (value: number) => Math.min(255, Math.max(0, value)) / 255;
  return { r: clamp(red), g: clamp(green), b: clamp(blue) };
}

/** Packs 0..1 channels into a 0xRRGGBB integer, which is what Three.js wants. */
export function rgbToHex({ r, g, b }: Rgb): number {
  const byte = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255);
  return (byte(r) << 16) | (byte(g) << 8) | byte(b);
}

/** "#rrggbb" for a 0..1 colour. */
export function rgbToCss(rgb: Rgb): string {
  return `#${rgbToHex(rgb).toString(16).padStart(6, '0')}`;
}

/** Parses "#rgb" or "#rrggbb" into 0..1 channels; null when it is not a colour. */
export function parseHex(hex: string): Rgb | null {
  const text = hex.trim().replace(/^#/, '');
  const full =
    text.length === 3
      ? text
          .split('')
          .map((c) => c + c)
          .join('')
      : text;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const value = parseInt(full, 16);
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
  };
}
