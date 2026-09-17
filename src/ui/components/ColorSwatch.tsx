import { useId } from 'react';
import styles from './ColorSwatch.module.css';

interface ColorSwatchProps {
  color: string;
  label: string;
  onChange?: (color: string) => void;
  size?: 'sm' | 'md';
}

/**
 * A colour square that opens the browser's picker when it can be changed.
 * Read-only swatches render as a plain square so they are not mistaken for
 * something clickable.
 */
export function ColorSwatch({ color, label, onChange, size = 'md' }: ColorSwatchProps) {
  const id = useId();

  if (!onChange) {
    return <span className={styles.swatch} data-size={size} style={{ background: color }} title={label} />;
  }

  return (
    <span className={styles.wrapper}>
      <input
        id={id}
        type="color"
        className={styles.input}
        value={color}
        aria-label={label}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
      />
      <label
        className={styles.swatch}
        data-size={size}
        data-editable="true"
        htmlFor={id}
        style={{ background: color }}
        title={label}
      />
    </span>
  );
}
