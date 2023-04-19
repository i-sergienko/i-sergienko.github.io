import {SceneElement} from './scene';
import GUI from 'lil-gui';
import {
  BoxGeometry,
  ColorRepresentation,
  DirectionalLight,
  DirectionalLightHelper, DoubleSide, Fog,
  Mesh,
  MeshStandardMaterial,
  Object3D, PlaneGeometry,
  Scene,
  Vector3
} from 'three';

export class DirectionalLighting implements SceneElement {
  private readonly light: DirectionalLight;
  private debugObject: any;
  private helper: DirectionalLightHelper;

  constructor(color: ColorRepresentation, intensity: number = 3, position: Vector3) {
    this.debugObject = {
      color,
    };

    this.light = new DirectionalLight(color, intensity);
    this.light.position.set(position.x, position.y, position.z);
    // TODO make configurable
    this.light.castShadow = true;
    this.light.shadow.camera.far = 15;
    this.light.shadow.mapSize.set(1024, 1024);

    this.helper = new DirectionalLightHelper(this.light);
  }

  addToScene(scene: Scene): void {
    scene.add(this.light);
    scene.add(this.helper);
  }

  setDebugParameters(gui: GUI): void {
    gui.addColor(this.debugObject, 'color').onChange(() => {
      this.light.color.set(this.debugObject.color);
    }).name('Light color');
    gui.add(this.light.position, 'x').min(-10).max(10).step(0.001).name('Light X');
    gui.add(this.light.position, 'y').min(-10).max(10).step(0.001).name('Light Y');
    gui.add(this.light.position, 'z').min(-10).max(10).step(0.001).name('Light Z');
    gui.add(this.light, 'intensity').min(0).max(10).step(0.001).name('Light intensity');
  }
}

export interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
}

export class Box implements SceneElement {
  private readonly material: MeshStandardMaterial;
  private readonly mesh: Object3D;
  private debugObject: any;

  constructor(dimensions: BoxDimensions, color: ColorRepresentation) {
    this.debugObject = {
      color
    };
    this.material = new MeshStandardMaterial({
      color,
    });
    this.mesh = new Mesh(
      new BoxGeometry(dimensions.width, dimensions.height, dimensions.depth, 1, 1, 1),
      this.material
    );
  }

  addToScene(scene: Scene): void {
    scene.add(this.mesh);
  }

  setDebugParameters(gui: GUI): void {
    gui.addColor(this.debugObject, 'color').onChange(() => {
      this.material.color.set(this.debugObject.color);
    }).name('Box color');
    gui.add(this.mesh.position, 'x').min(-10).max(10).step(0.001).name('Box X');
    gui.add(this.mesh.position, 'y').min(-10).max(10).step(0.001).name('Box Y');
    gui.add(this.mesh.position, 'z').min(-10).max(10).step(0.001).name('Box Z');
  }

}

export interface PlaneDimensions {
  width: number;
  height: number;
}

export class Plane implements SceneElement {
  private readonly material: MeshStandardMaterial;
  private readonly mesh: Object3D;
  private debugObject: any;

  constructor(dimensions: PlaneDimensions, color: ColorRepresentation) {
    this.debugObject = {
      color,
      rotation: {
        x: 0.0,
        y: 0.0,
        z: 0.0
      }
    };
    this.material = new MeshStandardMaterial({
      color,
      side: DoubleSide
    });
    this.mesh = new Mesh(
      new PlaneGeometry(dimensions.width, dimensions.height, 1, 1),
      this.material
    );
    this.mesh.rotateX(Math.PI / 2);
  }

  addToScene(scene: Scene): void {
    scene.add(this.mesh);
  }

  setDebugParameters(gui: GUI): void {
    gui.addColor(this.debugObject, 'color').onChange(() => {
      this.material.color.set(this.debugObject.color);
    }).name('Plane color');
    gui.add(this.mesh.position, 'x').min(-10).max(10).step(0.001).name('Plane X');
    gui.add(this.mesh.position, 'y').min(-10).max(10).step(0.001).name('Plane Y');
    gui.add(this.mesh.position, 'z').min(-10).max(10).step(0.001).name('Plane Z');

    const onRotationChange = () => {
      this.mesh.rotation.set(this.debugObject.rotation.x, this.debugObject.rotation.y, this.debugObject.rotation.z);
    };
    gui.add(this.debugObject.rotation, 'x').min(-(Math.PI * 2)).max((Math.PI * 2)).step(0.001)
      .name('Plane rotation X').onChange(onRotationChange);
    gui.add(this.debugObject.rotation, 'y').min(-(Math.PI * 2)).max((Math.PI * 2)).step(0.001)
      .name('Plane rotation Y').onChange(onRotationChange);
    gui.add(this.debugObject.rotation, 'z').min(-(Math.PI * 2)).max((Math.PI * 2)).step(0.001)
      .name('Plane rotation Z').onChange(onRotationChange);
  }

}

export class Smoke implements SceneElement {
  private fog: Fog;
  private debugObject: any;

  constructor(color: ColorRepresentation, near: number, far: number) {
    this.debugObject = {
      color
    };
    this.fog = new Fog(color, near, far);
  }

  addToScene(scene: Scene): void {
    scene.fog = this.fog;
  }

  setDebugParameters(gui: GUI): void {
    gui.addColor(this.debugObject, 'color').onChange(() => {
      this.fog.color.set(this.debugObject.color);
    }).name('Fog color');
    gui.add(this.fog, 'near').min(0).max(50).step(0.01).name('Fog offset (near)');
    gui.add(this.fog, 'far').min(0).max(100).step(0.01).name('Fog limit (far)');
  }
}
