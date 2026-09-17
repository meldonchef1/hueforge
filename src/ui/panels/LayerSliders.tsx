import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { VerticalSlider } from '../components/VerticalSlider';
import { ColorSwatch } from '../components/ColorSwatch';
import { layerTop } from '../../core/units';
import { FILAMENT_DRAG_TYPE } from './FilamentLibrary';
import type { Filament } from '../../core/filament';
import styles from './LayerSliders.module.css';

const SLOT_DRAG_TYPE = 'application/x-hueforge-slot';

export function LayerSliders() {
  const { t } = useTranslation();

  const stack = useAppStore((s) => s.doc.stack);
  const library = useAppStore((s) => s.library);
  const heights = useAppStore((s) => s.doc.heights);
  const layers = useAppStore((s) => s.computed.layers);
  const addToStack = useAppStore((s) => s.addToStack);
  const removeFromStack = useAppStore((s) => s.removeFromStack);
  const moveStackSlot = useAppStore((s) => s.moveStackSlot);
  const setStackSlotStart = useAppStore((s) => s.setStackSlotStart);
  const upsertFilament = useAppStore((s) => s.upsertFilament);

  const [dragOver, setDragOver] = useState(false);
  const byId = new Map(library.map((filament) => [filament.id, filament]));
  const maxLayer = Math.max(0, layers - 1);

  const acceptDrop = (event: React.DragEvent) => {
    const filamentId = event.dataTransfer.getData(FILAMENT_DRAG_TYPE);
    if (filamentId) {
      event.preventDefault();
      addToStack(filamentId);
    }
    setDragOver(false);
  };

  return (
    <div
      className={styles.root}
      data-drag-over={dragOver || undefined}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(FILAMENT_DRAG_TYPE)) {
          event.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={acceptDrop}
    >
      {stack.length === 0 ? (
        <div className={styles.empty}>
          <strong>{t('layers.empty.title')}</strong>
          <span>{t('layers.empty.hint')}</span>
        </div>
      ) : (
        <div className={styles.slots}>
          {stack.map((slot, index) => {
            const filament = byId.get(slot.filamentId);
            return (
              <Slot
                key={`${slot.filamentId}-${index}`}
                index={index}
                filament={filament}
                startLayer={slot.startLayer}
                maxLayer={maxLayer}
                heightMm={layerTop(slot.startLayer, heights.layerHeight, heights.firstLayerHeight)}
                onStartLayer={(layer) => setStackSlotStart(index, layer)}
                onRemove={() => removeFromStack(index)}
                onMove={(from) => moveStackSlot(from, index)}
                onTd={(td) => filament && upsertFilament({ ...filament, td })}
              />
            );
          })}
          <div className={styles.placeholder}>{t('layers.dropHint')}</div>
        </div>
      )}
    </div>
  );
}

interface SlotProps {
  index: number;
  filament: Filament | undefined;
  startLayer: number;
  maxLayer: number;
  heightMm: number;
  onStartLayer: (layer: number) => void;
  onRemove: () => void;
  onMove: (from: number) => void;
  onTd: (td: number) => void;
}

function Slot({
  index,
  filament,
  startLayer,
  maxLayer,
  heightMm,
  onStartLayer,
  onRemove,
  onMove,
  onTd,
}: SlotProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const name = filament?.name ?? t('layers.missing');

  return (
    <div
      className={styles.slot}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(SLOT_DRAG_TYPE, String(index));
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(SLOT_DRAG_TYPE)) event.preventDefault();
      }}
      onDrop={(event) => {
        const from = Number(event.dataTransfer.getData(SLOT_DRAG_TYPE));
        if (Number.isInteger(from)) {
          event.preventDefault();
          event.stopPropagation();
          onMove(from);
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu(true);
      }}
      onMouseLeave={() => setMenu(false)}
    >
      <input
        type="number"
        className={styles.td}
        value={filament?.td ?? 0}
        min={0.05}
        max={100}
        step={0.1}
        disabled={!filament}
        aria-label={t('layers.td', { name })}
        title={t('layers.tdTip')}
        onChange={(event) => {
          const td = Number(event.target.value);
          if (Number.isFinite(td) && td > 0) onTd(td);
        }}
      />

      <div className={styles.track}>
        <VerticalSlider
          label={t('layers.slider', { name })}
          value={startLayer}
          min={0}
          max={maxLayer}
          onChange={onStartLayer}
          color={filament?.color}
          // The bottom filament has to start at layer 0; there is nothing below it.
          disabled={index === 0 || maxLayer === 0}
        />
      </div>

      <div className={styles.readout}>
        <ColorSwatch color={filament?.color ?? '#555555'} label={name} size="sm" />
        <span className={styles.layerNumber}>{startLayer + 1}</span>
        <span className={styles.height}>{heightMm.toFixed(2)} mm</span>
        <span className={styles.name} title={name}>
          {name}
        </span>
      </div>

      {menu && (
        <div className={styles.menu} role="menu">
          <button type="button" role="menuitem" className={styles.menuItem} onClick={onRemove}>
            {t('layers.remove')}
          </button>
        </div>
      )}
    </div>
  );
}
