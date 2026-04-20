import { Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'nexum-theme';
  
  // Señal reactiva para el tema actual
  currentTheme = signal<Theme>('dark');
  
  constructor() {
    // Cargar tema guardado o detectar preferencia del sistema
    this.loadInitialTheme();
  }
  
  private loadInitialTheme(): void {
    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      this.currentTheme.set(savedTheme);
    } else {
      // Establecer tema oscuro como predeterminado (colores actuales del sistema)
      this.currentTheme.set('dark');
    }
    
    this.applyTheme();
  }
  
  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
  
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme();
  }
  
  private applyTheme(): void {
    const root = document.documentElement;
    const theme = this.currentTheme();
    
    // Remover clases de tema anteriores
    root.classList.remove('dark', 'light');
    
    // Agregar clase de tema actual
    root.classList.add(theme);
    
    // Aplicar variables CSS para el tema
    if (theme === 'dark') {
      // Usar colores actuales del sistema (slate-900/slate-800)
      root.style.setProperty('--bg-primary', '15 23 42');      // slate-900
      root.style.setProperty('--bg-secondary', '30 41 59');    // slate-800
      root.style.setProperty('--bg-tertiary', '51 65 85');     // slate-700
      root.style.setProperty('--text-primary', '248 250 252'); // white
      root.style.setProperty('--text-secondary', '203 213 225'); // slate-300
      root.style.setProperty('--text-tertiary', '148 163 184');  // slate-400
      root.style.setProperty('--border-color', '71 85 105');     // slate-600
      root.style.setProperty('--accent-color', '59 130 246');   // blue-500
      root.style.setProperty('--scrollbar-track', '30 41 59');   // slate-800
      root.style.setProperty('--scrollbar-thumb', '71 85 105');  // slate-600
      root.style.setProperty('--scrollbar-thumb-hover', '100 116 139'); // slate-500
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
  
  // Método para obtener clases CSS basadas en el tema
  getThemeClasses(): string {
    const theme = this.currentTheme();
    return theme === 'dark' 
      ? 'bg-slate-900 text-white border-slate-700' 
      : 'bg-white text-slate-900 border-slate-200';
  }
  
  // Método para obtener clases de fondo
  getBackgroundClasses(): string {
    const theme = this.currentTheme();
    return theme === 'dark' 
      ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
      : 'bg-gradient-to-br from-slate-50 to-white';
  }
}
