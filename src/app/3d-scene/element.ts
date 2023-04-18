import {SceneElement} from './scene';
import GUI from 'lil-gui';
import {
  BoxGeometry,
  ColorRepresentation,
  DirectionalLight,
  DirectionalLightHelper,
  Mesh,
  MeshStandardMaterial,
  Object3D,
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
