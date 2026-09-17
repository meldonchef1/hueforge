import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';
import { defaultDoc, defaultLayout, defaultSettings, defaultStatus, defaultView } from './defaults';

const reset = () =>
  useAppStore.setState({
    doc: defaultDoc(),
    view: defaultView(),
    settings: defaultSettings(),
    layout: defaultLayout(),
    status: defaultStatus(),
    past: [],
    future: [],
    layoutNonce: 0,
  });

describe('document history', () => {
  beforeEach(reset);

  it('walks back and forward through commits', () => {
    const { commit, undo, redo } = useAppStore.getState();

    commit((doc) => ({ ...doc, mode: 'lithophane' }));
    expect(useAppStore.getState().doc.mode).toBe('lithophane');

    undo();
    expect(useAppStore.getState().doc.mode).toBe('filament');

    redo();
    expect(useAppStore.getState().doc.mode).toBe('lithophane');
  });

  it('drops the redo stack once a new change is committed', () => {
    const { commit, undo } = useAppStore.getState();

    commit((doc) => ({ ...doc, mode: 'lithophane' }));
    undo();
    expect(useAppStore.getState().canRedo()).toBe(true);

    commit((doc) => ({ ...doc, name: 'portrait' }));
    expect(useAppStore.getState().canRedo()).toBe(false);
    expect(useAppStore.getState().doc.name).toBe('portrait');
  });

  it('ignores a recipe that changes nothing', () => {
    useAppStore.getState().commit((doc) => doc);
    expect(useAppStore.getState().canUndo()).toBe(false);
  });

  it('does nothing when there is no history left', () => {
    const { undo, redo } = useAppStore.getState();
    undo();
    redo();
    expect(useAppStore.getState().doc).toEqual(defaultDoc());
  });

  it('marks the project dirty on every document change', () => {
    useAppStore.getState().setSaveState('saved');
    useAppStore.getState().commit((doc) => ({ ...doc, name: 'cat' }));
    expect(useAppStore.getState().status.saveState).toBe('dirty');
  });

  it('does not undo preview-only settings', () => {
    useAppStore.getState().setView({ wireframe: true });
    expect(useAppStore.getState().canUndo()).toBe(false);
    expect(useAppStore.getState().view.wireframe).toBe(true);
  });

  it('clears history when a new project starts', () => {
    useAppStore.getState().commit((doc) => ({ ...doc, name: 'cat' }));
    useAppStore.getState().newProject();

    const state = useAppStore.getState();
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);
    expect(state.doc).toEqual(defaultDoc());
    expect(state.status.saveState).toBe('saved');
  });
});

describe('layout', () => {
  beforeEach(reset);

  it('toggles panel visibility', () => {
    useAppStore.getState().togglePanel('colorCore');
    expect(useAppStore.getState().layout.visible.colorCore).toBe(false);

    useAppStore.getState().togglePanel('colorCore');
    expect(useAppStore.getState().layout.visible.colorCore).toBe(true);
  });

  it('restores defaults and forces a rebuild on reset', () => {
    useAppStore.getState().togglePanel('preview');
    useAppStore.getState().setSerializedLayout({ grid: {} });
    useAppStore.getState().resetLayout();

    const state = useAppStore.getState();
    expect(state.layout.serialized).toBeNull();
    expect(state.layout.visible.preview).toBe(true);
    expect(state.layoutNonce).toBe(1);
  });
});

describe('camera reset', () => {
  beforeEach(reset);

  it('bumps a nonce the renderer can watch', () => {
    const before = useAppStore.getState().view.cameraResetNonce;
    useAppStore.getState().resetCamera();
    expect(useAppStore.getState().view.cameraResetNonce).toBe(before + 1);
  });
});
