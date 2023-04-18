import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WebGlScene} from '../3d-scene/scene';

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
    this.scene.addBox();
  }

  ngOnDestroy(): void {
    console.log('Destroying about');
    this.scene?.onDestroy();
  }

  onResize(e: UIEvent): void {
    this.scene.onResize(window.innerWidth, window.innerHeight);
  }
}
