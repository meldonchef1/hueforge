import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import styles from './StatusBar.module.css';

const EMPTY = '—';

export function StatusBar() {
  const { t, i18n } = useTranslation();
  const status = useAppStore((s) => s.status);

  const number = new Intl.NumberFormat(i18n.language);
  const overLimit = status.triangles > status.triangleLimit;

  return (
    <div className={styles.bar} role="status">
      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.meshHeight')}</span>
        <span className={styles.value}>
          {status.maxMeshHeight > 0
            ? `${status.meshHeight.toFixed(2)} / ${status.maxMeshHeight.toFixed(2)} mm`
            : EMPTY}
        </span>
      </span>

      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.triangles')}</span>
        <span
          className={styles.value}
          data-over={overLimit || undefined}
          title={overLimit ? t('statusBar.trianglesOverLimit', { limit: number.format(status.triangleLimit) }) : undefined}
        >
          {status.triangles > 0 ? number.format(status.triangles) : EMPTY}
        </span>
      </span>

      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.fps')}</span>
        <span className={styles.value}>{status.fps > 0 ? Math.round(status.fps) : EMPTY}</span>
      </span>

      <span className={styles.spacer} />

      {status.warnings.map((warning) => (
        <span key={warning} className={styles.warning}>
          {warning}
        </span>
      ))}

      <span className={styles.save} data-state={status.saveState}>
        {t(`statusBar.save.${status.saveState}`)}
      </span>
    </div>
  );
}
