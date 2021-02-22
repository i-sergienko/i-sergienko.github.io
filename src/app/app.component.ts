import {Component} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ivan-sergienko-blog';
  navbarBurgerActive = false;

  toggleNavbar(): void {
    this.navbarBurgerActive = !this.navbarBurgerActive;
  }
}
