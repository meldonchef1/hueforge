import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3 as ThreeVector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { kelvinToRgb, rgbToHex } from '../core/color';
import { SimulationMaterial } from './simulationMaterial';
import type { Rgb } from '../core/color';
import type { MeshResult } from '../store/meshBus';

export interface ViewerLight {
  kelvin: number;
  intensity: number;
}

/**
 * Owns the Three.js scene. Deliberately free of React so the render loop is
 * never tied to a component's lifecycle, and the mesh can be swapped without
 * rebuilding anything around it.
 */
export class Viewer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly plainMaterial: MeshStandardMaterial;
  private readonly simulationMaterial: SimulationMaterial;
  /** True once a stack has been simulated; before that the model is plain grey. */
  private simulating = false;
  private readonly key: DirectionalLight;
  private readonly fill: DirectionalLight;
  private readonly ambient: AmbientLight;
  private model: Mesh | null = null;
  private readonly slicePlane: Plane;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();

  private frame = 0;
  private frames = 0;
  private lastFpsAt = 0;
  private modelRadius = 60;
  private modelHeight = 0;

  /** Called about once a second with the measured frame rate. */
  onFps: ((fps: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.scene.background = new Color(0x0e1013);

    // A narrow field of view keeps a flat relief from skewing into a trapezoid.
    this.camera = new PerspectiveCamera(30, 1, 0.5, 2000);
    this.camera.position.set(0, -140, 110);
    this.camera.up.set(0, 0, 1);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // Double-sided so a height slice shows the inside of the cut rather than
    // looking straight through the model.
    this.plainMaterial = new MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.85,
      metalness: 0,
      side: DoubleSide,
    });
    this.simulationMaterial = new SimulationMaterial();
    this.simulationMaterial.side = DoubleSide;

    this.renderer.localClippingEnabled = true;
    this.slicePlane = new Plane(new ThreeVector3(0, 0, -1), Infinity);

    this.ambient = new AmbientLight(0xffffff, 0.5);
    this.key = new DirectionalLight(0xffffff, 2);
    this.key.position.set(-60, -90, 120);
    this.fill = new DirectionalLight(0xffffff, 0.7);
    this.fill.position.set(80, 60, 40);
    this.scene.add(this.ambient, this.key, this.fill);

    this.loop = this.loop.bind(this);
    this.frame = requestAnimationFrame(this.loop);
  }

  setMesh(result: MeshResult | null): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model.geometry.dispose();
      this.model = null;
    }
    if (!result) return;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(result.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(result.normals, 3));
    geometry.computeBoundingSphere();
    // The brush maps a hit position back to image coordinates through this.
    geometry.computeBoundingBox();

    this.model = new Mesh(geometry, this.activeMaterial());
    this.scene.add(this.model);
    this.modelRadius = geometry.boundingSphere?.radius ?? 60;
    this.modelHeight = result.maxHeight;
  }

  private activeMaterial() {
    return this.simulating ? this.simulationMaterial : this.plainMaterial;
  }

  /**
   * Hands over the simulated colour per layer. Passing null falls back to plain
   * grey, which is what an empty stack should look like.
   */
  setSimulation(column: Rgb[] | null, layerHeight: number, firstLayerHeight: number): void {
    const wanted = column !== null && column.length > 0;
    if (wanted) {
      this.simulationMaterial.setLut(column);
      this.simulationMaterial.setLayerHeights(layerHeight, firstLayerHeight);
    }
    if (wanted !== this.simulating) {
      this.simulating = wanted;
      if (this.model) this.model.material = this.activeMaterial();
    }
  }

  /**
   * Cuts the model off at `fraction` of its height. 1 shows the whole thing,
   * which means no clipping plane at all rather than one at the very top.
   */
  setSlice(fraction: number): void {
    const full = fraction >= 1;
    // The plane faces down, so its constant is the height it cuts at.
    this.slicePlane.constant = full ? Infinity : Math.max(0.0001, this.modelHeight * fraction);

    const planes = full ? [] : [this.slicePlane];
    this.plainMaterial.clippingPlanes = planes;
    this.simulationMaterial.clippingPlanes = planes;
  }

  /**
   * Where a screen position lands on the model, as image coordinates. The model
   * is a height map, so its XY maps straight onto the picture — no UV needed.
   */
  pick(ndcX: number, ndcY: number): { u: number; v: number } | null {
    if (!this.model) return null;

    this.pointer.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObject(this.model, false)[0];
    if (!hit) return null;

    const box = this.model.geometry.boundingBox;
    if (!box) return null;

    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    if (width <= 0 || height <= 0) return null;

    return {
      u: (hit.point.x - box.min.x) / width,
      // Row 0 of the image sits at the back of the model, so Y runs backwards.
      v: (box.max.y - hit.point.y) / height,
    };
  }

  /** Painting and orbiting cannot both own the drag. */
  setOrbitEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  setWireframe(on: boolean): void {
    this.plainMaterial.wireframe = on;
    this.simulationMaterial.wireframe = on;
  }

  setLight({ kelvin, intensity }: ViewerLight): void {
    const colour = rgbToHex(kelvinToRgb(kelvin));
    this.key.color.setHex(colour);
    this.fill.color.setHex(colour);
    this.ambient.color.setHex(colour);
    this.key.intensity = 2 * intensity;
    this.fill.intensity = 0.7 * intensity;
    this.ambient.intensity = 0.5 * intensity;
  }

  resetCamera(): void {
    // Far enough back that the whole model fits the vertical field of view.
    const distance = (this.modelRadius / Math.sin((this.camera.fov * Math.PI) / 360)) * 1.1;
    // Steep enough that a relief only millimetres deep still reads as relief.
    this.camera.position.set(0, -distance * 0.62, distance * 0.78);
    this.controls.target.set(0, 0, this.modelHeight / 2);
    this.controls.update();
  }

  /**
   * PNG of what is on screen. The drawing buffer is not preserved, so the
   * render and the read have to happen in the same task.
   */
  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  resize(width: number, height: number): void {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private loop(now: number): void {
    this.frame = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.frames++;
    if (now - this.lastFpsAt >= 1000) {
      this.onFps?.((this.frames * 1000) / (now - this.lastFpsAt));
      this.frames = 0;
      this.lastFpsAt = now;
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.controls.dispose();
    this.model?.geometry.dispose();
    this.plainMaterial.dispose();
    this.simulationMaterial.dispose();
    this.renderer.dispose();
  }
}
