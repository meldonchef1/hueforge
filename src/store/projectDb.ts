import { PROJECT_STORE, runRequest } from './db';
import type { ProjectImage } from './project';

/**
 * The autosaved image. Settings are small enough for localStorage, but a
 * decoded picture is megabytes, so it goes to IndexedDB — without this the
 * image is gone on every reload.
 */

const KEY = 'autosave-image';

export async function saveAutosavedImage(image: ProjectImage): Promise<void> {
  await runRequest(PROJECT_STORE, 'readwrite', (store) => store.put(image, KEY));
}

export async function loadAutosavedImage(): Promise<ProjectImage | null> {
  const value = await runRequest<unknown>(PROJECT_STORE, 'readonly', (store) => store.get(KEY));
  if (typeof value !== 'object' || value === null) return null;

  const record = value as Record<string, unknown>;
  if (typeof record.dataUrl !== 'string' || !record.dataUrl.startsWith('data:image/')) return null;

  return { name: typeof record.name === 'string' ? record.name : 'image', dataUrl: record.dataUrl };
}

export async function clearAutosavedImage(): Promise<void> {
  await runRequest(PROJECT_STORE, 'readwrite', (store) => store.delete(KEY));
}
