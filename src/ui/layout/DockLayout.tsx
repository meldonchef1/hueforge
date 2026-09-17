import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DockviewReact,
  themeDark,
  themeLight,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview';
import { useAppStore } from '../../store/useAppStore';
import type { PanelId } from '../../store/types';
import { PANEL_DEFINITIONS, type PanelDefinition } from './panelRegistry';
import styles from './DockLayout.module.css';

const LAYOUT_SAVE_DELAY = 400;

const components = Object.fromEntries(
  PANEL_DEFINITIONS.map((definition) => [
    definition.id,
    (_props: IDockviewPanelProps) => {
      const Component = definition.component;
      return (
        <div className={styles.panelBody}>
          <Component />
        </div>
      );
    },
  ]),
);

function addPanel(api: DockviewApi, definition: PanelDefinition, title: string) {
  const { placement } = definition;
  const reference = placement && 'reference' in placement ? api.getPanel(placement.reference) : undefined;

  api.addPanel({
    id: definition.id,
    component: definition.id,
    title,
    initialWidth: definition.initialWidth,
    initialHeight: definition.initialHeight,
    position: placement
      ? { direction: placement.direction, referencePanel: reference?.id }
      : undefined,
  });
}

export function DockLayout() {
  const { t } = useTranslation();
  const apiRef = useRef<DockviewApi | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Suppresses layout saves while we are the ones mutating the dock. */
  const restoring = useRef(true);

  const theme = useAppStore((s) => s.settings.theme);
  const visible = useAppStore((s) => s.layout.visible);
  const setPanelVisible = useAppStore((s) => s.setPanelVisible);
  const setSerializedLayout = useAppStore((s) => s.setSerializedLayout);

  const titleFor = useCallback((id: PanelId) => t(`panels.${id}`), [t]);

  const dockTheme = useMemo(
    () => ({ ...(theme === 'light' ? themeLight : themeDark), className: 'dockview-theme-hueforge' }),
    [theme],
  );

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const api = event.api;
      apiRef.current = api;
      restoring.current = true;

      const saved = useAppStore.getState().layout.serialized;
      let restored = false;
      if (saved) {
        try {
          api.fromJSON(saved as Parameters<DockviewApi['fromJSON']>[0]);
          restored = true;
        } catch {
          // A layout saved by an older build can be unreadable; fall back to defaults.
          api.clear();
        }
      }

      if (!restored) {
        const wanted = useAppStore.getState().layout.visible;
        for (const definition of PANEL_DEFINITIONS) {
          if (wanted[definition.id]) addPanel(api, definition, titleFor(definition.id));
        }
      }

      api.onDidRemovePanel((panel) => {
        if (restoring.current) return;
        setPanelVisible(panel.id as PanelId, false);
      });

      api.onDidLayoutChange(() => {
        if (restoring.current) return;
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSerializedLayout(api.toJSON()), LAYOUT_SAVE_DELAY);
      });

      restoring.current = false;
    },
    [setPanelVisible, setSerializedLayout, titleFor],
  );

  // Open or close panels to match the menu's checkboxes.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    for (const definition of PANEL_DEFINITIONS) {
      const panel = api.getPanel(definition.id);
      if (visible[definition.id] && !panel) {
        addPanel(api, definition, titleFor(definition.id));
      } else if (!visible[definition.id] && panel) {
        panel.api.close();
      }
    }
  }, [visible, titleFor]);

  // Panel titles live in the dock, not in React, so they need an explicit refresh.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    for (const definition of PANEL_DEFINITIONS) {
      api.getPanel(definition.id)?.api.setTitle(titleFor(definition.id));
    }
  }, [titleFor]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  return (
    <div className={styles.root}>
      <DockviewReact components={components} onReady={onReady} theme={dockTheme} />
    </div>
  );
}
