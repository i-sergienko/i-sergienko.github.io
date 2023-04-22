import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WebGlScene} from '../3d-scene/scene';
import {
  BoxGeometry,
  DirectionalLight,
  DirectionalLightHelper,
  DoubleSide,
  Fog, Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry, Vector3
} from "three";
import GUI from 'lil-gui';
import {group} from "@angular/animations";

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, OnDestroy {
  @ViewChild('canvasElement', {static: true})
  canvas: ElementRef<HTMLCanvasElement>;

  private scene?: WebGlScene;

  // private debugMenu: GUI;

  constructor() {
    this.scene = null;
    // this.debugMenu = new GUI();
  }

  ngOnInit(): void {
    this.scene = new WebGlScene(this.canvas.nativeElement, {
      width: window.innerWidth,
      height: window.innerHeight,
      orbitControls: false,
      debugMenu: true
    });
    this.buildScene();
  }

  ngOnDestroy(): void {
    this.scene?.onDestroy();
  }

  onResize(e: UIEvent): void {
    this.scene.onResize(window.innerWidth, window.innerHeight);
  }

  private buildScene(): void {
    // const debugMenu = this.debugMenu;
    this.scene.configure((scene, camera, renderer) => {
      renderer.setClearColor('#ff68cc'); // Match fog color
      scene.fog = new Fog('#ff68cc', 1, 15);

      const baseGroup = new Group();
      scene.add(baseGroup);

      const plane = new Mesh(
        new PlaneGeometry(100, 100, 1, 1),
        new MeshStandardMaterial({
          color: '#00ffff',
          side: DoubleSide
        })
      );
      plane.rotateX(-Math.PI / 2);
      baseGroup.add(plane);

      const boxGeometry = new BoxGeometry(1, 1, 1, 1, 1, 1);
      const boxMaterial = new MeshStandardMaterial({
        color: '#00ff00'
      });
      const xOffset = -10;
      const boxes: Mesh[] = [];
      for (let i = 0; i < 20; i++) {
        const box = new Mesh(boxGeometry, boxMaterial);
        box.position.x = i * 2 + xOffset;
        box.position.y = 2;
        box.position.z = 3;

        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        boxes.push(box);
      }

      const light = new DirectionalLight('#ff68cc', 3);
      light.castShadow = true;
      light.shadow.camera.far = 20;
      light.shadow.mapSize.set(1024, 1024);
      light.position.set(-10, 2, 3);

      light.rotateX(-Math.PI * 0.25);
      light.rotateY(-Math.PI * 0.25);

      baseGroup.add(light);

      const lightHelper = new DirectionalLightHelper(light);
      baseGroup.add(lightHelper);

      // debugMenu.add(light.position, 'x').min(-10).max(10).step(0.01).name('Light X');
      // debugMenu.add(light.position, 'y').min(-10).max(10).step(0.01).name('Light y');
      // debugMenu.add(light.position, 'z').min(-10).max(10).step(0.01).name('Light Z');

      camera.position.set(-5.558299395618101, 4.147773446882737, 0.8802921323608275);
      camera.rotation.set(-2.5785674837792913, -0.4604240868952921, -2.868169165856609);

      // debugMenu.add(camera.position, 'x').min(-10).max(10).step(0.01).name('Camera X');
      // debugMenu.add(camera.position, 'y').min(-10).max(10).step(0.01).name('Camera Y');
      // debugMenu.add(camera.position, 'z').min(-10).max(10).step(0.01).name('Camera Z');

      let elapsedTime = 0;
      return (delta: number) => {
        elapsedTime += delta;
        for (const box of boxes) {
          box.position.z = Math.sin(elapsedTime + box.position.x) * 2 + 5;
          box.position.y = Math.cos(elapsedTime + box.position.x) + 2;
        }
      };
    });
  }
}
