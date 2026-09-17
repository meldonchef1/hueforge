import { useTranslation } from 'react-i18next';
import styles from './PanelPlaceholder.module.css';

interface PanelPlaceholderProps {
  /** Milestone that fills this panel in, shown so an empty panel reads as planned, not broken. */
  milestone: number;
  orientation?: 'horizontal' | 'vertical';
}

export function PanelPlaceholder({ milestone, orientation = 'horizontal' }: PanelPlaceholderProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.root} data-orientation={orientation}>
      <span className={styles.text}>{t('panels.placeholder', { milestone })}</span>
    </div>
  );
}
