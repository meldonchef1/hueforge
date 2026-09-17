import type { Viewer } from './Viewer';

/**
 * The viewer currently on screen. The File menu needs to grab a snapshot of it,
 * and the menu is nowhere near the preview panel in the tree — passing a ref
 * down through the dock would be worse than this one module.
 */
let active: Viewer | null = null;

export const activeViewer = {
  get: () => active,
  set: (viewer: Viewer | null) => {
    active = viewer;
  },
};
