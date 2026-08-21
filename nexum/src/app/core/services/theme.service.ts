import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'nexum-theme';

  // Señal reactiva para el tema actual
  currentTheme = signal<Theme>('system');

  constructor() {
    this.loadInitialTheme();
  }

  private loadInitialTheme(): void {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme | null;

    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      this.currentTheme.set(savedTheme);
    } else {
      this.currentTheme.set('system');
    }

    this.applyTheme();
    this.listenToSystemTheme();
  }

  toggleTheme(): void {
    const next: Theme =
      this.currentTheme() === 'light' ? 'dark' :
      this.currentTheme() === 'dark' ? 'system' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme();
  }

  private listenToSystemTheme(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (this.currentTheme() === 'system') {
        this.applyTheme();
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
    } else if ((mql as any).addListener) {
      (mql as any).addListener(onChange);
    }
  }

  private isDark(): boolean {
    if (this.currentTheme() === 'dark') return true;
    if (this.currentTheme() === 'light') return false;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const dark = this.isDark();

    root.classList.remove('dark', 'light');
    root.classList.add(dark ? 'dark' : 'light');

    if (dark) {
      root.style.setProperty('--bg-primary', '15 23 42');
      root.style.setProperty('--bg-secondary', '30 41 59');
      root.style.setProperty('--bg-tertiary', '51 65 85');
      root.style.setProperty('--text-primary', '248 250 252');
      root.style.setProperty('--text-secondary', '203 213 225');
      root.style.setProperty('--text-tertiary', '148 163 184');
      root.style.setProperty('--border-color', '71 85 105');
      root.style.setProperty('--accent-color', '59 130 246');
      root.style.setProperty('--scrollbar-track', '30 41 59');
      root.style.setProperty('--scrollbar-thumb', '71 85 105');
      root.style.setProperty('--scrollbar-thumb-hover', '100 116 139');
    } else {
      root.style.setProperty('--bg-primary', '248 250 252');
      root.style.setProperty('--bg-secondary', '241 245 249');
      root.style.setProperty('--bg-tertiary', '226 232 240');
      root.style.setProperty('--text-primary', '15 23 42');
      root.style.setProperty('--text-secondary', '30 41 59');
      root.style.setProperty('--text-tertiary', '71 85 105');
      root.style.setProperty('--border-color', '203 213 225');
      root.style.setProperty('--accent-color', '59 130 246');
      root.style.setProperty('--scrollbar-track', '241 245 249');
      root.style.setProperty('--scrollbar-thumb', '203 213 225');
      root.style.setProperty('--scrollbar-thumb-hover', '148 163 184');
    }
  }

  getThemeClasses(): string {
    return this.isDark()
      ? 'bg-slate-900 text-white border-slate-700'
      : 'bg-white text-slate-900 border-slate-200';
  }

  getBackgroundClasses(): string {
    return this.isDark()
      ? 'bg-gradient-to-br from-slate-900 to-slate-800'
      : 'bg-gradient-to-br from-slate-50 to-white';
  }
}
