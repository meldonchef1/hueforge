import { useTranslation } from 'react-i18next';
import { Menu, type MenuDefinition } from '../components/Menu';
import { useAppStore } from '../../store/useAppStore';
import { PANEL_IDS } from '../../store/defaults';
import { exportStl } from '../exports';
import { loadImageFile } from '../loadImage';
import type { Language, Theme, Units } from '../../store/types';

/** Items whose feature lands in a later milestone are shown but disabled. */
const PLANNED = { kind: 'action', onSelect: () => {}, disabled: true } as const;

export function MenuBar() {
  const { t } = useTranslation();

  const newProject = useAppStore((s) => s.newProject);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const hasPast = useAppStore((s) => s.past.length > 0);
  const hasFuture = useAppStore((s) => s.future.length > 0);

  const visible = useAppStore((s) => s.layout.visible);
  const togglePanel = useAppStore((s) => s.togglePanel);
  const resetLayout = useAppStore((s) => s.resetLayout);

  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setImage = useAppStore((s) => s.setImage);
  const hasMesh = useAppStore((s) => s.computed.triangles > 0);

  /** Reads an image straight from the clipboard; Ctrl+V works regardless. */
  const pasteImage = async () => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((candidate) => candidate.startsWith('image/'));
        if (!type) continue;
        const blob = await item.getType(type);
        const loaded = await loadImageFile(new File([blob], 'clipboard.png', { type }));
        setImage(loaded.pixels, loaded.name);
        return;
      }
    } catch {
      // Denied or unsupported: the paste shortcut is still there.
    }
  };

  const menus: MenuDefinition[] = [
    {
      id: 'file',
      label: t('menu.file.label'),
      items: [
        { kind: 'action', label: t('menu.file.new'), onSelect: newProject },
        { kind: 'separator' },
        { ...PLANNED, label: t('menu.file.open') },
        { ...PLANNED, label: t('menu.file.save'), shortcut: 'Ctrl+S' },
        { ...PLANNED, label: t('menu.file.saveAs') },
        { kind: 'separator' },
        {
          kind: 'action',
          label: t('menu.file.exportStl'),
          onSelect: () => void exportStl(),
          disabled: !hasMesh,
        },
        { ...PLANNED, label: t('menu.file.export3mf') },
        { ...PLANNED, label: t('menu.file.exportSwaps') },
        { ...PLANNED, label: t('menu.file.exportPng') },
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit.label'),
      items: [
        { kind: 'action', label: t('menu.edit.undo'), onSelect: undo, shortcut: 'Ctrl+Z', disabled: !hasPast },
        { kind: 'action', label: t('menu.edit.redo'), onSelect: redo, shortcut: 'Ctrl+Y', disabled: !hasFuture },
        { kind: 'separator' },
        {
          kind: 'action',
          label: t('menu.edit.pasteImage'),
          shortcut: 'Ctrl+V',
          onSelect: () => void pasteImage(),
        },
      ],
    },
    {
      id: 'view',
      label: t('menu.view.label'),
      items: [
        ...PANEL_IDS.map((id) => ({
          kind: 'toggle' as const,
          label: t(`panels.${id}`),
          checked: visible[id],
          onSelect: () => togglePanel(id),
        })),
        { kind: 'separator' },
        { kind: 'action', label: t('menu.view.resetLayout'), onSelect: resetLayout },
      ],
    },
    {
      id: 'preferences',
      label: t('menu.preferences.label'),
      items: [
        { kind: 'heading', label: t('menu.preferences.units') },
        ...(['mm', 'in'] as Units[]).map((units) => ({
          kind: 'radio' as const,
          label: t(`units.${units}`),
          checked: settings.units === units,
          onSelect: () => setSettings({ units }),
        })),
        { kind: 'separator' },
        { kind: 'heading', label: t('menu.preferences.theme') },
        ...(['dark', 'light'] as Theme[]).map((theme) => ({
          kind: 'radio' as const,
          label: t(`theme.${theme}`),
          checked: settings.theme === theme,
          onSelect: () => setSettings({ theme }),
        })),
        { kind: 'separator' },
        { kind: 'heading', label: t('menu.preferences.language') },
        ...(['cs', 'en'] as Language[]).map((language) => ({
          kind: 'radio' as const,
          label: t(`language.${language}`),
          checked: settings.language === language,
          onSelect: () => setSettings({ language }),
        })),
        { kind: 'separator' },
        { ...PLANNED, label: t('menu.preferences.defaultPrinter') },
      ],
    },
    {
      id: 'help',
      label: t('menu.help.label'),
      items: [
        { ...PLANNED, label: t('menu.help.firstPrintGuide') },
        { ...PLANNED, label: t('menu.help.shortcuts') },
        { kind: 'separator' },
        { ...PLANNED, label: t('app.version', { version: __APP_VERSION__ }) },
      ],
    },
  ];

  return <Menu menus={menus} />;
}
