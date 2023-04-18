import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WebGlScene} from '../3d-scene/scene';
import {Box, DirectionalLighting} from '../3d-scene/element';
import {Vector3} from 'three';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, OnDestroy {
  @ViewChild('canvasElement', {static: true})
  canvas: ElementRef<HTMLCanvasElement>;

  private scene?: WebGlScene;

  constructor() {
    this.scene = null;
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
    const light = new DirectionalLighting('#ff68cc', 3, new Vector3(0.25, 3, -2.25));
    this.scene.addElement(light);

    const box = new Box({
      width: 1, height: 1, depth: 1
    }, '#ff0000');
    this.scene.addElement(box);
  }
}
