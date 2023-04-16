import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {WebGlScene} from "../3d-scene/scene";

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, AfterViewInit {
  @ViewChild('canvasElement') canvasElement: HTMLElement;

  private scene?: WebGlScene;

  constructor() {
    this.scene = null;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.scene = new WebGlScene(this.canvasElement, window.innerWidth, window.innerHeight);
  }
}
