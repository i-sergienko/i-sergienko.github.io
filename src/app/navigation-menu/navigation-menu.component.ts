import { Component, OnInit } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-navigation-menu',
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.css']
})
export class NavigationMenuComponent implements OnInit {
  navbarBurgerActive = false;

  constructor(public router: Router) { }

  ngOnInit(): void {
  }

  toggleNavbar(): void {
    this.navbarBurgerActive = !this.navbarBurgerActive;
  }

}
