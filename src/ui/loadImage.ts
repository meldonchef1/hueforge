/**
 * Decoding lives here rather than in core because it needs the DOM. Everything
 * downstream works on plain pixel data.
 */

/**
 * Longest edge kept after loading. The mesh resamples to the detail setting
 * anyway, so a 6000px photo would cost 100 MB of memory to gain nothing.
 */
const MAX_EDGE = 2048;

export interface LoadedImage {
  pixels: ImageData;
  name: string;
}

function drawToImageData(source: ImageBitmap): ImageData {
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context unavailable');

  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    return { pixels: drawToImageData(bitmap), name: file.name };
  } finally {
    bitmap.close();
  }
}

/** Pulls the first image out of a paste or drop, or null when there is none. */
export function imageFromDataTransfer(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of data.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  for (const file of data.files) {
    if (file.type.startsWith('image/')) return file;
  }
  return null;
}
