/**
 * One IndexedDB connection for everything that has to outlive a reload: the
 * filament library and the autosaved image. Keeping the upgrade in a single
 * place means the version number cannot drift between the two.
 */

const DB_NAME = 'hueforge';
const DB_VERSION = 2;

export const FILAMENT_STORE = 'filaments';
export const PROJECT_STORE = 'project';

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILAMENT_STORE)) {
        db.createObjectStore(FILAMENT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

/** Runs one request against a store and closes the connection after it. */
export async function runRequest<T>(
  store: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const request = work(transaction.objectStore(store));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    db.close();
  }
}
