import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {faHome, faMoon, faRadiationAlt, faSun, IconDefinition} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navigation-menu',
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.css']
})
export class NavigationMenuComponent implements OnInit {
  navbarBurgerActive = false;
  // FontAwesome Icons
  faHome: IconDefinition = faHome;
  // Active theme
  theme: ThemeConfig;

  private themes: Dictionary<ThemeConfig>;

  constructor(public router: Router) {
  }

  ngOnInit(): void {
    this.themes = new Dictionary<ThemeConfig>();
    this.themes.light = {
      cssPath: '/assets/css/bulma.min.css',
      nextThemeName: 'dark',
      nextThemeIcon: faSun
    };
    this.themes.dark = {
      cssPath: '/assets/css/darkly.min.css',
      nextThemeName: 'nuclear',
      nextThemeIcon: faMoon
    };
    this.themes.nuclear = {
      cssPath: '/assets/css/nuclear.min.css',
      nextThemeName: 'light',
      nextThemeIcon: faRadiationAlt
    };

    this.switchTheme('light');
  }

  toggleNavbar(): void {
    this.navbarBurgerActive = !this.navbarBurgerActive;
  }

  switchTheme(themeName: string): void {
    this.theme = this.themes[themeName];
    document.getElementById('global-theme').setAttribute('href', this.theme.cssPath);
  }
}

class Dictionary<T> {
  [key: string]: T;
}

export interface ThemeConfig {
  cssPath: string;
  nextThemeName: string;
  nextThemeIcon: IconDefinition;
}
