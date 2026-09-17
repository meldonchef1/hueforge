import { useEffect, useRef, useState } from 'react';
import styles from './Menu.module.css';

export type MenuItem =
  | { kind: 'action'; label: string; onSelect: () => void; shortcut?: string; disabled?: boolean }
  | { kind: 'toggle'; label: string; checked: boolean; onSelect: () => void; shortcut?: string }
  | { kind: 'radio'; label: string; checked: boolean; onSelect: () => void }
  | { kind: 'heading'; label: string }
  | { kind: 'separator' };

export interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

interface MenuProps {
  menus: MenuDefinition[];
}

export function Menu({ menus }: MenuProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openId]);

  return (
    <div className={styles.bar} ref={rootRef} role="menubar">
      {menus.map((menu) => (
        <div key={menu.id} className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openId === menu.id}
            className={styles.trigger}
            data-open={openId === menu.id || undefined}
            onClick={() => setOpenId((current) => (current === menu.id ? null : menu.id))}
            // Once a menu is open, sliding across the bar switches menus like a desktop app.
            onPointerEnter={() => setOpenId((current) => (current ? menu.id : current))}
          >
            {menu.label}
          </button>
          {openId === menu.id && (
            <div className={styles.dropdown} role="menu" aria-label={menu.label}>
              {menu.items.map((item, index) => (
                <MenuRow key={index} item={item} onDone={() => setOpenId(null)} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MenuRow({ item, onDone }: { item: MenuItem; onDone: () => void }) {
  if (item.kind === 'separator') return <div className={styles.separator} role="separator" />;
  if (item.kind === 'heading') return <div className={styles.heading}>{item.label}</div>;

  const checked = item.kind === 'action' ? undefined : item.checked;
  const disabled = item.kind === 'action' ? item.disabled : false;
  const shortcut = item.kind === 'radio' ? undefined : item.shortcut;

  return (
    <button
      type="button"
      role={item.kind === 'radio' ? 'menuitemradio' : item.kind === 'toggle' ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={checked}
      className={styles.item}
      disabled={disabled}
      onClick={() => {
        item.onSelect();
        onDone();
      }}
    >
      <span className={styles.check} aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className={styles.itemLabel}>{item.label}</span>
      {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
    </button>
  );
}
