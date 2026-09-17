import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import styles from './HelpDialogs.module.css';

/** The four steps between an image and a printed model. */
const GUIDE_STEPS = ['image', 'filaments', 'swaps', 'export'] as const;

export function FirstPrintGuide({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Modal title={t('guide.title')} onClose={onClose}>
      <p className={styles.lead}>{t('guide.lead')}</p>

      <ol className={styles.steps}>
        {GUIDE_STEPS.map((step, index) => (
          <li key={step} className={styles.step}>
            <span className={styles.number}>{index + 1}</span>
            <div>
              <strong className={styles.stepTitle}>{t(`guide.${step}.title`)}</strong>
              <p className={styles.stepBody}>{t(`guide.${step}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className={styles.footnote}>{t('guide.calibrationNote')}</p>
    </Modal>
  );
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Modal title={t('menu.help.shortcuts')} onClose={onClose}>
      <table className={styles.table}>
        <tbody>
          {SHORTCUTS.map((shortcut) => (
            <tr key={shortcut.id}>
              <td className={styles.keys}>{shortcut.keys}</td>
              <td>{t(`shortcuts.${shortcut.id}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.footnote}>{t('shortcuts.note')}</p>
    </Modal>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Modal title={t('app.name')} onClose={onClose}>
      <p className={styles.lead}>{t('about.body')}</p>
      <p className={styles.footnote}>{t('app.version', { version: __APP_VERSION__ })}</p>
    </Modal>
  );
}
