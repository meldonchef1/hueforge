import { useTranslation } from 'react-i18next';
import { MenuBar } from './panels/MenuBar';
import { TopBar } from './panels/TopBar';
import { StatusBar } from './panels/StatusBar';
import { DockLayout } from './layout/DockLayout';
import { useThemeSync } from './hooks/useThemeSync';
import { useLanguageSync } from './hooks/useLanguageSync';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMeshPipeline } from './hooks/useMeshPipeline';
import { useAppStore } from '../store/useAppStore';
import styles from './App.module.css';

export function App() {
  const { t } = useTranslation();
  useThemeSync();
  useLanguageSync();
  useAutosave();
  useKeyboardShortcuts();
  useMeshPipeline();

  // Remounting on reset is the only way to rebuild dockview from the default layout.
  const layoutNonce = useAppStore((s) => s.layoutNonce);

  return (
    <div className={styles.app}>
      <MenuBar />
      <TopBar />
      <DockLayout key={layoutNonce} />
      <StatusBar />
      <div className={styles.tooSmall}>
        <strong>{t('app.tooSmall.title')}</strong>
        <p>{t('app.tooSmall.body')}</p>
      </div>
    </div>
  );
}
