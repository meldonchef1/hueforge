import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  defaultDoc,
  defaultLayout,
  defaultSettings,
  defaultStatus,
  defaultView,
  PANEL_IDS,
} from './defaults';
import type {
  DocState,
  LayoutState,
  PanelId,
  SaveState,
  SettingsState,
  StatusState,
  ViewState,
} from './types';

const HISTORY_LIMIT = 100;

export interface AppState {
  doc: DocState;
  view: ViewState;
  settings: SettingsState;
  layout: LayoutState;
  status: StatusState;
  past: DocState[];
  future: DocState[];
  /** Bumped by resetLayout to force the dock to rebuild from the default layout. */
  layoutNonce: number;

  /** Applies a change to the document and pushes the previous one onto the undo stack. */
  commit: (recipe: (doc: DocState) => DocState) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setView: (patch: Partial<ViewState>) => void;
  resetCamera: () => void;
  setSettings: (patch: Partial<SettingsState>) => void;
  setStatus: (patch: Partial<StatusState>) => void;
  setSaveState: (saveState: SaveState) => void;

  setPanelVisible: (id: PanelId, visible: boolean) => void;
  togglePanel: (id: PanelId) => void;
  setSerializedLayout: (serialized: object | null) => void;
  resetLayout: () => void;

  newProject: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      doc: defaultDoc(),
      view: defaultView(),
      settings: defaultSettings(),
      layout: defaultLayout(),
      status: defaultStatus(),
      past: [],
      future: [],
      layoutNonce: 0,

      commit: (recipe) =>
        set((state) => {
          const next = recipe(state.doc);
          if (next === state.doc) return state;
          return {
            doc: next,
            past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
            future: [],
            status: { ...state.status, saveState: 'dirty' },
          };
        }),

      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);
          if (!previous) return state;
          return {
            doc: previous,
            past: state.past.slice(0, -1),
            future: [state.doc, ...state.future],
            status: { ...state.status, saveState: 'dirty' },
          };
        }),

      redo: () =>
        set((state) => {
          const [next, ...rest] = state.future;
          if (!next) return state;
          return {
            doc: next,
            past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
            future: rest,
            status: { ...state.status, saveState: 'dirty' },
          };
        }),

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      setView: (patch) => set((state) => ({ view: { ...state.view, ...patch } })),

      resetCamera: () =>
        set((state) => ({ view: { ...state.view, cameraResetNonce: state.view.cameraResetNonce + 1 } })),

      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      setStatus: (patch) => set((state) => ({ status: { ...state.status, ...patch } })),

      setSaveState: (saveState) => set((state) => ({ status: { ...state.status, saveState } })),

      setPanelVisible: (id, visible) =>
        set((state) => ({ layout: { ...state.layout, visible: { ...state.layout.visible, [id]: visible } } })),

      togglePanel: (id) =>
        set((state) => ({
          layout: {
            ...state.layout,
            visible: { ...state.layout.visible, [id]: !state.layout.visible[id] },
          },
        })),

      setSerializedLayout: (serialized) => set((state) => ({ layout: { ...state.layout, serialized } })),

      resetLayout: () => set((state) => ({ layout: defaultLayout(), layoutNonce: state.layoutNonce + 1 })),

      newProject: () =>
        set({
          doc: defaultDoc(),
          view: defaultView(),
          status: { ...defaultStatus(), saveState: 'saved' },
          past: [],
          future: [],
        }),
    }),
    {
      name: 'hueforge.app',
      version: 1,
      partialize: (state) => ({ doc: state.doc, settings: state.settings, layout: state.layout }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState> | undefined;
        if (!saved) return current;
        const visible = { ...defaultLayout().visible, ...saved.layout?.visible };
        // Drop panels that no longer exist so a stale save can't resurrect them.
        for (const key of Object.keys(visible) as PanelId[]) {
          if (!PANEL_IDS.includes(key)) delete visible[key];
        }
        return {
          ...current,
          doc: { ...current.doc, ...saved.doc },
          settings: { ...current.settings, ...saved.settings },
          layout: { serialized: saved.layout?.serialized ?? null, visible },
        };
      },
    },
  ),
);

export const selectDoc = (s: AppState) => s.doc;
export const selectView = (s: AppState) => s.view;
export const selectSettings = (s: AppState) => s.settings;
export const selectStatus = (s: AppState) => s.status;
export const selectLayout = (s: AppState) => s.layout;
