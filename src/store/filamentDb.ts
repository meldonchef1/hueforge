import { parseFilaments, type Filament } from '../core/filament';

/**
 * The filament library lives in IndexedDB rather than localStorage: it grows
 * with every filament the user adds and outlives any single project.
 */

const DB_NAME = 'hueforge';
const DB_VERSION = 1;
const STORE = 'filaments';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = work(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function readAll(): Promise<Filament[]> {
  const rows = await run<unknown[]>('readonly', (store) => store.getAll());
  return parseFilaments(rows);
}

export async function writeAll(filaments: Filament[]): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    store.clear();
    for (const filament of filaments) store.put(filament);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
  });
  db.close();
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
