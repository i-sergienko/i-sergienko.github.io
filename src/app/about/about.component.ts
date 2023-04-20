import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WebGlScene} from '../3d-scene/scene';
import {
  DirectionalLight,
  DirectionalLightHelper,
  DoubleSide,
  Fog,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry
} from "three";
import GUI from 'lil-gui';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, OnDestroy {
  @ViewChild('canvasElement', {static: true})
  canvas: ElementRef<HTMLCanvasElement>;

  private scene?: WebGlScene;
  private debugMenu: GUI;

  constructor() {
    this.scene = null;
    this.debugMenu = new GUI();
  }

  ngOnInit(): void {
    this.scene = new WebGlScene(this.canvas.nativeElement, {
      width: window.innerWidth,
      height: window.innerHeight,
      orbitControls: true,
      debugMenu: true
    });
    this.buildScene();
  }

  ngOnDestroy(): void {
    console.log('Destroying about');
    this.scene?.onDestroy();
  }

  onResize(e: UIEvent): void {
    this.scene.onResize(window.innerWidth, window.innerHeight);
  }

  private buildScene(): void {
    const debugMenu = this.debugMenu;
    this.scene.configure((scene, camera, renderer) => {
      renderer.setClearColor('#ff68cc'); // Match fog color
      scene.fog = new Fog('#ff68cc', 1, 15);

      const plane = new Mesh(
        new PlaneGeometry(100, 100, 1, 1),
        new MeshStandardMaterial({
          color: '#00ffff',
          side: DoubleSide
        })
      );
      plane.rotateX(-Math.PI / 2);
      scene.add(plane);

      const light = new DirectionalLight('#ff68cc', 3);
      light.castShadow = true;
      light.shadow.camera.far = 100;
      light.shadow.mapSize.set(1024, 1024);
      light.position.set(0, 2, 0);
      scene.add(light);

      const lightHelper = new DirectionalLightHelper(light);
      scene.add(lightHelper);

      debugMenu.add(light.position, 'x').min(-10).max(10).step(0.01).name('Light X');
      debugMenu.add(light.position, 'y').min(-10).max(10).step(0.01).name('Light y');
      debugMenu.add(light.position, 'z').min(-10).max(10).step(0.01).name('Light Z');

      camera.position.y = 2;
      camera.position.z = -4;
      debugMenu.add(camera.position, 'x').min(-10).max(10).step(0.01).name('Camera X');
      debugMenu.add(camera.position, 'y').min(-10).max(10).step(0.01).name('Camera Y');
      debugMenu.add(camera.position, 'z').min(-10).max(10).step(0.01).name('Camera Z');
    });
  }
}
