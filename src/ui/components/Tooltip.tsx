import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  delay?: number;
}

interface Position {
  x: number;
  y: number;
}

export function Tooltip({ label, children, delay = 400 }: TooltipProps) {
  const id = useId();
  const [position, setPosition] = useState<Position | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (event: { currentTarget: EventTarget & Element }) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.bottom + 6;
      timer.current = setTimeout(() => setPosition({ x, y }), delay);
    },
    [delay],
  );

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setPosition(null);
  }, []);

  return (
    <span className={styles.wrapper} onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
      <span aria-describedby={position ? id : undefined} className={styles.anchor}>
        {children}
      </span>
      {position && (
        <span
          role="tooltip"
          id={id}
          className={styles.bubble}
          style={{ left: position.x, top: position.y }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
