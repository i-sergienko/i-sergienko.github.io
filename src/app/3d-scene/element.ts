import {SceneElement} from './scene';
import GUI from 'lil-gui';
import {BoxGeometry, ColorRepresentation, DirectionalLight, Mesh, MeshBasicMaterial, Object3D, Vector3} from 'three';

export class DirectionalLighting implements SceneElement {
  private readonly light: DirectionalLight;
  private debugObject: any;

  constructor(color: ColorRepresentation, intensity: number = 3, position: Vector3) {
    this.debugObject = {
      color
    };

    this.light = new DirectionalLight(color, intensity);
    this.light.position.set(position.x, position.y, position.z);
    // TODO make configurable
    this.light.castShadow = true;
    this.light.shadow.camera.far = 15;
    this.light.shadow.mapSize.set(1024, 1024);
  }

  getObject(): Object3D {
    return this.light;
  }

  setDebugParameters(gui: GUI): void {
    gui.addColor(this.debugObject, 'color').onChange(() => {
      this.light.color.set(this.debugObject.color);
    }).name('Light color');
    gui.add(this.light.position, 'x').min(-10).max(10).step(0.001).name('Light X');
    gui.add(this.light.position, 'y').min(-10).max(10).step(0.001).name('Light Y');
    gui.add(this.light.position, 'z').min(-10).max(10).step(0.001).name('Light Z');
  }
}

export interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
}

export class Box implements SceneElement {
  private readonly material: MeshBasicMaterial;
  private readonly mesh: Object3D;
  private debugObject: any;

  constructor(dimensions: BoxDimensions, color: ColorRepresentation) {
    this.debugObject = {
      color
    };
    this.material = new MeshBasicMaterial({color});
    this.mesh = new Mesh(
      new BoxGeometry(dimensions.width, dimensions.height, dimensions.depth, 1, 1, 1),
      this.material
    );
  }

  getObject(): Object3D {
    return this.mesh;
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
