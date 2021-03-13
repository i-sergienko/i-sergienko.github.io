import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {faHome, IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons';
import {ThemeConfig, ThemeSwitcherService} from '../theme-switcher.service';

@Component({
  selector: 'app-navigation-menu',
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.css']
})
export class NavigationMenuComponent implements OnInit {
  navbarBurgerActive = false;
  // FontAwesome Icons
  faHome: IconDefinition = faHome;
  faGithub: IconDefinition = faGithub;
  faLinkedin: IconDefinition = faLinkedin;
  // Theme
  theme: ThemeConfig;

  constructor(public router: Router, public themeSwitcher: ThemeSwitcherService) {
  }

  ngOnInit(): void {
    this.theme = this.themeSwitcher.defaultTheme();
  }

  switchTheme(): void {
    this.theme = this.themeSwitcher.nextTheme(this.theme);
  }

  toggleNavbar(): void {
    this.navbarBurgerActive = !this.navbarBurgerActive;
  }
}
