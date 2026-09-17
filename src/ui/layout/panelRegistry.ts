import type { ComponentType } from 'react';
import type { PanelId } from '../../store/types';
import { FilamentLibrary } from '../panels/FilamentLibrary';
import { Preview } from '../panels/Preview';
import { ColorCore } from '../panels/ColorCore';
import { HeightSlice } from '../panels/HeightSlice';
import { SourceImage } from '../panels/SourceImage';
import { LayerSliders } from '../panels/LayerSliders';
import { ModelGeometry } from '../panels/ModelGeometry';

export type Placement =
  | { direction: 'left' | 'right' | 'above' | 'below'; reference: PanelId }
  | { direction: 'below' };

export interface PanelDefinition {
  id: PanelId;
  /** Where the panel lands when the default layout is built or it is re-opened from the menu. */
  placement?: Placement;
  initialWidth?: number;
  initialHeight?: number;
  component: ComponentType;
}

/**
 * Order matters: the default layout is built by walking this list, so every
 * placement may only reference a panel that appears before it.
 */
export const PANEL_DEFINITIONS: readonly PanelDefinition[] = [
  { id: 'preview', component: Preview },
  {
    id: 'filamentLibrary',
    placement: { direction: 'left', reference: 'preview' },
    initialWidth: 260,
    component: FilamentLibrary,
  },
  {
    id: 'colorCore',
    placement: { direction: 'right', reference: 'preview' },
    initialWidth: 96,
    component: ColorCore,
  },
  {
    id: 'heightSlice',
    placement: { direction: 'right', reference: 'colorCore' },
    initialWidth: 64,
    component: HeightSlice,
  },
  {
    id: 'sourceImage',
    placement: { direction: 'right', reference: 'heightSlice' },
    initialWidth: 400,
    component: SourceImage,
  },
  {
    id: 'layerSliders',
    placement: { direction: 'below' },
    initialHeight: 300,
    component: LayerSliders,
  },
  {
    id: 'modelGeometry',
    placement: { direction: 'right', reference: 'layerSliders' },
    initialWidth: 700,
    component: ModelGeometry,
  },
];

export const PANEL_BY_ID = new Map<PanelId, PanelDefinition>(
  PANEL_DEFINITIONS.map((definition) => [definition.id, definition]),
);
