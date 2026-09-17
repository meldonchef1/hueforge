import styles from './VerticalSlider.module.css';

interface VerticalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Tints the track and thumb, so a slider reads as "its" filament. */
  color?: string;
  disabled?: boolean;
}

/**
 * A range input turned on its side. Native rather than hand-rolled so keyboard
 * control and screen readers work without reimplementing them.
 */
export function VerticalSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  color,
  disabled,
}: VerticalSliderProps) {
  return (
    <input
      type="range"
      className={styles.slider}
      style={color ? ({ '--slider-color': color } as React.CSSProperties) : undefined}
      aria-label={label}
      title={label}
      value={value}
      min={min}
      max={Math.max(min, max)}
      step={step}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
