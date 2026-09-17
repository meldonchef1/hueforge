import { useId } from 'react';
import { Tooltip } from './Tooltip';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, tooltip, disabled }: CheckboxProps) {
  const id = useId();
  const field = (
    <span className={styles.root}>
      <input
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </span>
  );

  return tooltip ? <Tooltip label={tooltip}>{field}</Tooltip> : field;
}
