import {Injectable} from '@angular/core';
import {faMoon, faRadiationAlt, faSun, IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ThemeSwitcherService {
  // Active theme
  private readonly themes: Dictionary<ThemeConfig>;

  constructor(private httpClient: HttpClient) {
    this.themes = new Dictionary<ThemeConfig>();
    this.themes.light = {
      name: 'light',
      cssPath: '/assets/css/bulma.min.css',
      nextThemeName: 'dark',
      nextThemeIcon: faSun
    };
    this.themes.dark = {
      name: 'dark',
      cssPath: '/assets/css/darkly.min.css',
      nextThemeName: 'nuclear',
      nextThemeIcon: faMoon
    };
    this.themes.nuclear = {
      name: 'nuclear',
      cssPath: '/assets/css/nuclear.min.css',
      nextThemeName: 'light',
      nextThemeIcon: faRadiationAlt
    };
  }

  defaultTheme(): ThemeConfig {
    const theme = this.themes[localStorage.getItem('theme')] || this.themes.light;
    this.setTheme(theme);
    return theme;
  }

  setTheme(theme: ThemeConfig): void {
    this.httpClient.get(theme.cssPath, {responseType: 'text'}).subscribe(_ => {
      localStorage.setItem('theme', theme.name);
      document.getElementById('global-theme').setAttribute('href', theme.cssPath);
    });
  }

  nextTheme(theme: ThemeConfig): ThemeConfig {
    const next = this.themes[theme.nextThemeName];
    this.setTheme(next);
    return next;
  }
}

class Dictionary<T> {
  [key: string]: T;
}

export interface ThemeConfig {
  name: string;
  cssPath: string;
  nextThemeName: string;
  nextThemeIcon: IconDefinition;
}
