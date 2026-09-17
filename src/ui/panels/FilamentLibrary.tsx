import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { hueOf, MATERIALS, parseFilaments, type Filament, type Material } from '../../core/filament';
import { ColorSwatch } from '../components/ColorSwatch';
import { downloadBlob } from '../download';
import styles from './FilamentLibrary.module.css';

type SortKey = 'name' | 'color' | 'td';

/** Payload for dragging a filament onto the layer panel. */
export const FILAMENT_DRAG_TYPE = 'application/x-hueforge-filament';

export function FilamentLibrary() {
  const { t } = useTranslation();

  const library = useAppStore((s) => s.library);
  const upsertFilament = useAppStore((s) => s.upsertFilament);
  const removeFilament = useAppStore((s) => s.removeFilament);
  const importFilaments = useAppStore((s) => s.importFilaments);
  const addToStack = useAppStore((s) => s.addToStack);

  const [material, setMaterial] = useState<Material>('PLA');
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const brands = useMemo(
    () => [...new Set(library.map((f) => f.brand).filter(Boolean))].sort(),
    [library],
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = library.filter((filament) => {
      if (filament.material !== material) return false;
      if (brand && filament.brand !== brand) return false;
      if (ownedOnly && !filament.owned) return false;
      if (!needle) return true;
      return `${filament.brand} ${filament.name}`.toLowerCase().includes(needle);
    });

    return filtered.sort((a, b) => {
      if (sort === 'td') return a.td - b.td;
      if (sort === 'color') return hueOf(a.color) - hueOf(b.color);
      return a.name.localeCompare(b.name);
    });
  }, [library, material, brand, ownedOnly, search, sort]);

  const addFilament = () => {
    const id = `custom-${Date.now().toString(36)}`;
    upsertFilament({
      id,
      brand: t('library.newBrand'),
      name: t('library.newName'),
      material,
      color: '#7f7f7f',
      td: 1.5,
      owned: true,
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'hueforge-filaments.json');
  };

  const importJson = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = parseFilaments(JSON.parse(await file.text()));
      if (parsed.length > 0) importFilaments(parsed);
    } catch {
      // A file that is not a filament library simply does not import.
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist" aria-label={t('panels.filamentLibrary')}>
        {MATERIALS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === material}
            className={styles.tab}
            data-active={key === material || undefined}
            onClick={() => setMaterial(key)}
          >
            {key === 'custom' ? t('library.custom') : key}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder={t('library.search')}
          aria-label={t('library.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.select}
          aria-label={t('library.brand')}
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
        >
          <option value="">{t('library.allBrands')}</option>
          {brands.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label={t('library.sort')}
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
        >
          <option value="name">{t('library.sortName')}</option>
          <option value="color">{t('library.sortColor')}</option>
          <option value="td">{t('library.sortTd')}</option>
        </select>
        <label className={styles.ownedFilter}>
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(event) => setOwnedOnly(event.target.checked)}
          />
          {t('library.ownedOnly')}
        </label>
      </div>

      <ul className={styles.list}>
        {shown.map((filament) => (
          <FilamentRow
            key={filament.id}
            filament={filament}
            onChange={upsertFilament}
            onRemove={() => removeFilament(filament.id)}
            onAdd={() => addToStack(filament.id)}
          />
        ))}
        {shown.length === 0 && <li className={styles.empty}>{t('library.empty')}</li>}
      </ul>

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={addFilament}>
          {t('library.new')}
        </button>
        <button type="button" className={styles.button} onClick={() => fileRef.current?.click()}>
          {t('library.import')}
        </button>
        <button type="button" className={styles.button} onClick={exportJson}>
          {t('library.export')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className={styles.file}
          onChange={(event) => void importJson(event.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

interface RowProps {
  filament: Filament;
  onChange: (filament: Filament) => void;
  onRemove: () => void;
  onAdd: () => void;
}

function FilamentRow({ filament, onChange, onRemove, onAdd }: RowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  return (
    <li
      className={styles.row}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(FILAMENT_DRAG_TYPE, filament.id);
        event.dataTransfer.effectAllowed = 'copy';
      }}
      onDoubleClick={onAdd}
    >
      <input
        type="checkbox"
        className={styles.owned}
        checked={filament.owned}
        aria-label={t('library.owned')}
        title={t('library.owned')}
        onChange={(event) => onChange({ ...filament, owned: event.target.checked })}
      />

      <ColorSwatch
        color={filament.color}
        label={t('library.color', { name: filament.name })}
        onChange={(color) => onChange({ ...filament, color })}
      />

      {editing ? (
        <input
          className={styles.nameInput}
          value={filament.name}
          autoFocus
          aria-label={t('library.name')}
          onChange={(event) => onChange({ ...filament, name: event.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button type="button" className={styles.name} onDoubleClick={() => setEditing(true)}>
          <span className={styles.brand}>{filament.brand}</span>
          {filament.name}
        </button>
      )}

      <input
        type="number"
        className={styles.td}
        value={filament.td}
        min={0.05}
        max={100}
        step={0.1}
        aria-label={t('library.td', { name: filament.name })}
        title={t('library.tdTip')}
        onChange={(event) => {
          const td = Number(event.target.value);
          if (Number.isFinite(td) && td > 0) onChange({ ...filament, td });
        }}
      />

      <button type="button" className={styles.add} title={t('library.addToStack')} onClick={onAdd}>
        +
      </button>
      <button type="button" className={styles.remove} title={t('library.remove')} onClick={onRemove}>
        ×
      </button>
    </li>
  );
}
