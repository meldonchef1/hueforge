import { writeBinaryStl } from '../core/stl';
import { meshBus } from '../store/meshBus';
import { useAppStore } from '../store/useAppStore';
import { downloadBlob, exportBaseName } from './download';

/** Writes the current mesh out as a binary STL. No-op when nothing is built. */
export function exportStl(): boolean {
  const mesh = meshBus.get();
  if (!mesh || mesh.triangleCount === 0) return false;

  const { source, doc } = useAppStore.getState();
  const name = exportBaseName(source.name || doc.name);
  const buffer = writeBinaryStl(mesh, `HueForge ${name}`);

  downloadBlob(new Blob([buffer], { type: 'model/stl' }), `${name}.stl`);
  return true;
}
