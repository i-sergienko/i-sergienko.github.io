import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Camera, Clock,
  Material,
  Mesh,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  WebGLRenderer
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui';

export interface SceneParameters {
  width: number;
  height: number;
  orbitControls: boolean;
  debugMenu: boolean;
}

export interface SceneElement {
  addToScene(scene: Scene): void;

  setDebugParameters(gui: GUI): void;
}

export class WebGlScene {
  private parameters: SceneParameters;

  private readonly scene: Scene;
  private readonly camera: Camera;
  private renderer: WebGLRenderer;
  private clock: Clock;

  private controls: OrbitControls | null = null;
  private elapsedTime = 0;

  private frameAction: (delta: number) => void = (delta: number) => {
  };

  constructor(canvas: HTMLCanvasElement, parameters: SceneParameters) {
    this.parameters = parameters;

    // Scene
    this.scene = new Scene();

    // Camera
    this.camera = new PerspectiveCamera(
      75,
      this.parameters.width / this.parameters.height,
      0.1,
      100
    );
    this.scene.add(this.camera);

    // Controls (optional)
    if (parameters.orbitControls) {
      this.controls = new OrbitControls(this.camera, canvas);
    }

    // Renderer
    this.renderer = new WebGLRenderer({canvas}); // TODO decide if need to set 'antialias: true'
    this.renderer.setSize(this.parameters.width, this.parameters.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Color and lights config
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    // Shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    // Clock
    this.clock = new Clock();

    setTimeout(() => this.onFrame(), 1);
  }

  onDestroy(): void {
    const objects: Object3D[] = [];
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();

    this.scene.traverse(object => {
      objects.push(object);

      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        materials.add(object.material);
      }
    });

    objects.forEach(object => {
      this.scene.remove(object);
    });
    materials.forEach(material => {
      material.dispose();
    });
    geometries.forEach(geometry => {
      geometry.dispose();
    });
  }

  onFrame(): void {
    const elapsedTime = this.clock.getElapsedTime();
    const delta = elapsedTime - this.elapsedTime;
    this.elapsedTime = elapsedTime;

    // Update controls
    this.controls?.update();

    this.frameAction(delta); // TODO

    // Render
    this.renderer.render(this.scene, this.camera);

    // Call tick again on the next frame
    requestAnimationFrame(() => this.onFrame());
  }

  onResize(width: number, height: number): void {
    // Update sizes
    this.parameters.width = width;
    this.parameters.height = height;

    // Update camera
    // @ts-ignore
    this.camera.aspect = this.parameters.width / this.parameters.height;
    // @ts-ignore
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(this.parameters.width, this.parameters.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  configure(block: (scene: Scene, camera: Camera, renderer: WebGLRenderer) => ((delta: number) => void)): void {
    this.frameAction = block(this.scene, this.camera, this.renderer);
  }
}
