import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Camera,
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

  private controls: OrbitControls | null = null;
  private guiDebugMenu: GUI | null = null;

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
    this.camera.position.set(4, 1, -4); // TODO decide how to initialize
    this.scene.add(this.camera);

    // Controls (optional)
    if (parameters.orbitControls) {
      this.controls = new OrbitControls(this.camera, canvas);
    }
    // Debug menu (optional)
    if (parameters.debugMenu) {
      this.guiDebugMenu = new GUI();
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
    // Update controls
    this.controls?.update();

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

  addElement(element: SceneElement): void {
    element.addToScene(this.scene);
    if (this.guiDebugMenu !== null) {
      element.setDebugParameters(this.guiDebugMenu);
    }
  }
}
