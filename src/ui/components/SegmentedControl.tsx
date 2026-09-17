import { Tooltip } from './Tooltip';
import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  tooltip?: string;
}

interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.root} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const button = (
          <button
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={styles.segment}
            data-selected={option.value === value || undefined}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
        return (
          <span key={option.value} className={styles.slot}>
            {option.tooltip ? <Tooltip label={option.tooltip}>{button}</Tooltip> : button}
          </span>
        );
      })}
    </div>
  );
}
