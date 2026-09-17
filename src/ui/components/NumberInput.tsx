import { useEffect, useId, useRef, useState } from 'react';
import { Tooltip } from './Tooltip';
import styles from './NumberInput.module.css';

interface NumberInputProps {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  tooltip?: string;
  /** Returns an error message for a rejected value, or null when it is fine. */
  validate?: (value: number) => string | null;
  disabled?: boolean;
}

/** Decimal places implied by the step, so 0.04 shows as "0.04" and not "0.0400001". */
function precisionOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

const format = (value: number, precision: number) => value.toFixed(precision);

export function NumberInput({
  label,
  value,
  step,
  onChange,
  min,
  max,
  unit,
  tooltip,
  validate,
  disabled = false,
}: NumberInputProps) {
  const id = useId();
  const precision = precisionOf(step);
  const [draft, setDraft] = useState(() => format(value, precision));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(format(value, precision));
      setError(null);
    }
  }, [value, precision]);

  const clamp = (next: number) => {
    let result = next;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    // Float noise from repeated stepping would otherwise leak into the value.
    return Number(result.toFixed(Math.max(precision, 6)));
  };

  const submit = (raw: string) => {
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setDraft(format(value, precision));
      setError(null);
      return;
    }
    const next = clamp(parsed);
    const message = validate?.(next) ?? null;
    setError(message);
    if (message) return;
    setDraft(format(next, precision));
    if (next !== value) onChange(next);
  };

  const nudge = (direction: 1 | -1) => {
    const next = clamp(value + direction * step);
    if (validate?.(next)) return;
    setDraft(format(next, precision));
    setError(null);
    if (next !== value) onChange(next);
  };

  const field = (
    <input
      ref={inputRef}
      id={id}
      className={styles.input}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-errormessage={error ? `${id}-error` : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={(event) => {
        focused.current = false;
        submit(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          nudge(1);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          nudge(-1);
        } else if (event.key === 'Enter') {
          submit(event.currentTarget.value);
        } else if (event.key === 'Escape') {
          setDraft(format(value, precision));
          setError(null);
          event.currentTarget.blur();
        }
      }}
      // Only steps while focused, so scrolling a panel never changes a value by accident.
      onWheel={(event) => {
        if (document.activeElement !== event.currentTarget) return;
        event.preventDefault();
        nudge(event.deltaY < 0 ? 1 : -1);
      }}
    />
  );

  return (
    <div className={styles.root} data-disabled={disabled || undefined}>
      <label className={styles.label} htmlFor={id}>
        {tooltip ? <Tooltip label={tooltip}>{label}</Tooltip> : label}
      </label>
      <div className={styles.control}>
        {field}
        {unit && <span className={styles.unit}>{unit}</span>}
        <div className={styles.spinner}>
          <button
            type="button"
            className={styles.stepUp}
            tabIndex={-1}
            disabled={disabled}
            aria-label={`${label} +`}
            onClick={() => nudge(1)}
          >
            ▲
          </button>
          <button
            type="button"
            className={styles.stepDown}
            tabIndex={-1}
            disabled={disabled}
            aria-label={`${label} −`}
            onClick={() => nudge(-1)}
          >
            ▼
          </button>
        </div>
      </div>
      {error && (
        <span id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
