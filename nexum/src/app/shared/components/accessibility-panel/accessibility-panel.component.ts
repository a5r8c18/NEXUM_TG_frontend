import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccessibilityService, AccessibilitySettings } from '../../../core/services/accessibility.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-accessibility-panel',
  templateUrl: './accessibility-panel.component.html',
  standalone: true,
})
export class AccessibilityPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  settings: AccessibilitySettings;
  isOpen = false;

  // Font size options
  fontSizeOptions = [
    { value: 'small', label: 'Pequeño', icon: 'A' },
    { value: 'medium', label: 'Mediano', icon: 'A' },
    { value: 'large', label: 'Grande', icon: 'A' },
    { value: 'extra-large', label: 'Extra Grande', icon: 'A' },
  ];

  constructor(private accessibilityService: AccessibilityService) {
    this.settings = this.accessibilityService.getSettings();
  }

  ngOnInit() {
    this.accessibilityService.settingsChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.settings = settings;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle panel visibility
   */
  togglePanel() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      // Focus first element when panel opens
      setTimeout(() => {
        const firstFocusable = document.querySelector('.accessibility-panel button') as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
    }
  }

  /**
   * Update font size
   */
  updateFontSize(fontSize: 'small' | 'medium' | 'large' | 'extra-large') {
    this.accessibilityService.updateSettings({ fontSize });
    this.announceChange(`Tamaño de fuente cambiado a ${this.fontSizeOptions.find(opt => opt.value === fontSize)?.label}`);
  }

  /**
   * Toggle high contrast
   */
  toggleHighContrast() {
    const newValue = !this.settings.highContrast;
    this.accessibilityService.updateSettings({ highContrast: newValue });
    this.announceChange(newValue ? 'Alto contraste activado' : 'Alto contraste desactivado');
  }

  /**
   * Toggle reduced motion
   */
  toggleReducedMotion() {
    const newValue = !this.settings.reducedMotion;
    this.accessibilityService.updateSettings({ reducedMotion: newValue });
    this.announceChange(newValue ? 'Movimiento reducido activado' : 'Movimiento reducido desactivado');
  }

  /**
   * Toggle keyboard navigation indicators
   */
  toggleKeyboardNavigation() {
    const newValue = !this.settings.keyboardNavigation;
    this.accessibilityService.updateSettings({ keyboardNavigation: newValue });
    this.announceChange(newValue ? 'Navegación por teclado activada' : 'Navegación por teclado desactivada');
  }

  /**
   * Reset all settings to default
   */
  resetSettings() {
    this.accessibilityService.updateSettings({
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
    });
    this.announceChange('Configuración de accesibilidad restablecida');
  }

  /**
   * Announce changes to screen readers
   */
  private announceChange(message: string) {
    this.accessibilityService.announce(message);
  }

  /**
   * Handle keyboard navigation
   */
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.isOpen = false;
      // Return focus to toggle button
      const toggleButton = document.querySelector('.accessibility-toggle') as HTMLElement;
      if (toggleButton) {
        toggleButton.focus();
      }
    }
  }

  /**
   * Get font size for display
   */
  getFontSize(fontSize: string): string {
    const sizes: Record<string, string> = {
      'small': '12px',
      'medium': '14px',
      'large': '16px',
      'extra-large': '18px',
    };
    return sizes[fontSize] || '14px';
  }
}
