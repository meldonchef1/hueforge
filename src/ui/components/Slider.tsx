import { useId } from 'react';
import { Tooltip } from './Tooltip';
import styles from './Slider.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  tooltip?: string;
  /** Rendered next to the slider; omit to hide the readout. */
  format?: (value: number) => string;
}

export function Slider({ label, value, min, max, step, onChange, tooltip, format }: SliderProps) {
  const id = useId();
  const labelNode = (
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
  );

  return (
    <div className={styles.root}>
      {tooltip ? <Tooltip label={tooltip}>{labelNode}</Tooltip> : labelNode}
      <input
        id={id}
        className={styles.input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {format && <output className={styles.readout}>{format(value)}</output>}
    </div>
  );
}
