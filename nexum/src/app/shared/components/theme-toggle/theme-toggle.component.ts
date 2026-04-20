import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="toggleTheme()"
      class="p-2 transition-colors duration-200"
      [class]="getThemeClasses()"
      [title]="tooltipText()">
      
      <!-- Sol (modo claro) -->
      @if (themeService.currentTheme() === 'dark') {
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
      }
      
      <!-- Luna (modo oscuro) -->
      @else {
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        </svg>
      }
    </button>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
  
  getThemeClasses(): string {
    const theme: Theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-600 hover:text-slate-900';
    } else {
      return 'text-slate-400 hover:text-white';
    }
  }
  
  tooltipText(): string {
    const theme: Theme = this.themeService.currentTheme();
    return theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  }
}
