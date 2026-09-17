import type { BuildResult } from '../workers/meshWorker';

export type MeshResult = Omit<BuildResult, 'type' | 'id'>;

/**
 * Holds the current mesh outside React. It is tens of megabytes and both the
 * 3D preview and the STL export need it, but nothing about it belongs in a
 * render cycle — pushing it through the store would re-render on every rebuild.
 */
let current: MeshResult | null = null;
const listeners = new Set<(mesh: MeshResult | null) => void>();

export const meshBus = {
  get: () => current,

  set(mesh: MeshResult | null) {
    current = mesh;
    for (const listener of listeners) listener(mesh);
  },

  subscribe(listener: (mesh: MeshResult | null) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
