import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { TRIANGLE_LIMIT } from '../../store/types';
import styles from './StatusBar.module.css';

const EMPTY = '—';

export function StatusBar() {
  const { t, i18n } = useTranslation();
  const status = useAppStore((s) => s.status);
  const computed = useAppStore((s) => s.computed);

  const number = new Intl.NumberFormat(i18n.language);
  const overLimit = computed.triangles > TRIANGLE_LIMIT;

  return (
    <div className={styles.bar} role="status">
      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.meshHeight')}</span>
        <span className={styles.value}>
          {computed.maxHeight > 0 ? `${computed.maxHeight.toFixed(2)} mm` : EMPTY}
        </span>
      </span>

      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.layers')}</span>
        <span className={styles.value}>
          {computed.layers > 0 ? number.format(computed.layers) : EMPTY}
        </span>
      </span>

      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.triangles')}</span>
        <span
          className={styles.value}
          data-over={overLimit || undefined}
          title={
            overLimit
              ? t('statusBar.trianglesOverLimit', { limit: number.format(TRIANGLE_LIMIT) })
              : undefined
          }
        >
          {computed.triangles > 0 ? number.format(computed.triangles) : EMPTY}
        </span>
      </span>

      <span className={styles.field}>
        <span className={styles.label}>{t('statusBar.fps')}</span>
        <span className={styles.value}>{status.fps > 0 ? Math.round(status.fps) : EMPTY}</span>
      </span>

      <span className={styles.spacer} />

      {overLimit && (
        <span className={styles.warning}>
          {t('statusBar.trianglesOverLimit', { limit: number.format(TRIANGLE_LIMIT) })}
        </span>
      )}
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
