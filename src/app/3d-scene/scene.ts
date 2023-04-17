import {
  ACESFilmicToneMapping, BoxGeometry,
  BufferGeometry,
  Camera,
  Material,
  Mesh, MeshBasicMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  sRGBEncoding,
  WebGLRenderer
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

interface ViewPortSize {
  width: number;
  height: number;
}

export class WebGlScene {
  private readonly scene: Scene;
  private readonly camera: Camera;
  private viewPortSize: ViewPortSize;
  private renderer: WebGLRenderer;

  private controls?: OrbitControls;

  constructor(canvas: HTMLCanvasElement, viewPortWidth: number, viewPortHeight: number) {
    this.viewPortSize = {
      width: viewPortWidth,
      height: viewPortHeight
    };

    // Scene
    this.scene = new Scene();

    // Camera
    this.camera = new PerspectiveCamera(
      75,
      this.viewPortSize.width / this.viewPortSize.height,
      0.1,
      100
    );
    this.camera.position.set(4, 1, -4); // TODO decide how to initialize
    this.scene.add(this.camera);

    // Controls (optional)
    this.controls = new OrbitControls(this.camera, canvas);

    // Renderer
    this.renderer = new WebGLRenderer({canvas}); // TODO decide if need to set 'antialias: true'
    this.renderer.setSize(this.viewPortSize.width, this.viewPortSize.height);
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
    this.controls.update();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Call tick again on the next frame
    requestAnimationFrame(() => this.onFrame());
  }

  onResize(width: number, height: number): void {
    // Update sizes
    this.viewPortSize.width = width;
    this.viewPortSize.height = height;

    // Update camera
    // @ts-ignore
    this.camera.aspect = this.viewPortSize.width / this.viewPortSize.height;
    // @ts-ignore
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(this.viewPortSize.width, this.viewPortSize.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  addBox(): void {
    const box = new Mesh(
      new BoxGeometry(1, 1, 1, 1, 1, 1),
      new MeshBasicMaterial({color: 'red'})
    );
    this.scene.add(box);
  }
}
