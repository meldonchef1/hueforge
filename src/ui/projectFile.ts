import { buildProject, parseProject, type ProjectFile, type ProjectImage } from '../store/project';
import { clearAutosavedImage, saveAutosavedImage } from '../store/projectDb';
import { useAppStore } from '../store/useAppStore';
import { downloadBlob, exportBaseName } from './download';

/**
 * Turning the live state into a file and back. The image travels as a PNG data
 * URL so a project stays one file you can email yourself, at the cost of about
 * a third more bytes than the raw PNG.
 */

export const PROJECT_EXTENSION = '.hueforge';

export function imageDataToDataUrl(pixels: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')?.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

export function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(context.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => reject(new Error('Image in project could not be decoded'));
    image.src = dataUrl;
  });
}

function currentProject(): ProjectFile {
  const { doc, layout, source } = useAppStore.getState();
  const image: ProjectImage | null = source.pixels
    ? { name: source.name, dataUrl: imageDataToDataUrl(source.pixels) }
    : null;
  return buildProject(doc, layout, image);
}

/** Writes the project out as a file the browser downloads. */
export function saveProject(): void {
  const project = currentProject();
  const json = JSON.stringify(project);
  const name = `${exportBaseName(project.doc.name || 'projekt')}${PROJECT_EXTENSION}`;
  downloadBlob(new Blob([json], { type: 'application/json' }), name);
}

/** Reads a project file into the app. Returns false when the file is not one. */
export async function openProjectFile(file: File): Promise<boolean> {
  let project: ProjectFile | null = null;
  try {
    project = parseProject(JSON.parse(await file.text()));
  } catch {
    return false;
  }
  if (!project) return false;

  const store = useAppStore.getState();
  store.loadProject(project.doc, project.layout);

  if (project.image) {
    try {
      const pixels = await dataUrlToImageData(project.image.dataUrl);
      store.setImage(pixels, project.image.name);
      void saveAutosavedImage(project.image);
    } catch {
      // A project whose image will not decode is still worth opening.
      store.clearImage();
      void clearAutosavedImage();
    }
  } else {
    store.clearImage();
    void clearAutosavedImage();
  }

  return true;
}
