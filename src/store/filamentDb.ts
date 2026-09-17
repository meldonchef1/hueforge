import { parseFilaments, type Filament } from '../core/filament';
import { FILAMENT_STORE, openDb, runRequest } from './db';

/**
 * The filament library lives in IndexedDB rather than localStorage: it grows
 * with every filament the user adds and outlives any single project.
 */

export async function readAll(): Promise<Filament[]> {
  const rows = await runRequest<unknown[]>(FILAMENT_STORE, 'readonly', (store) => store.getAll());
  return parseFilaments(rows);
}

export async function writeAll(filaments: Filament[]): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(FILAMENT_STORE, 'readwrite');
      const store = transaction.objectStore(FILAMENT_STORE);
      store.clear();
      for (const filament of filaments) store.put(filament);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
    });
  } finally {
    db.close();
  }
}

/** Fetches the bundled library that ships with the app. */
export async function fetchDefaults(): Promise<Filament[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}filaments/default.json`);
  if (!response.ok) throw new Error(`Default filaments unavailable (${response.status})`);
  return parseFilaments(await response.json());
}

/**
 * Library to start from: what the user has saved, or the bundled defaults the
 * first time round. A browser that blocks IndexedDB still gets the defaults.
 */
export async function loadLibrary(): Promise<Filament[]> {
  try {
    const saved = await readAll();
    if (saved.length > 0) return saved;
  } catch {
    // Private mode or blocked storage: fall through to the bundled list.
  }

  const defaults = await fetchDefaults();
  try {
    await writeAll(defaults);
  } catch {
    // Not being able to save them is survivable; they are still usable now.
  }
  return defaults;
}
