import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AccessibilityService {
  private renderer: Renderer2;
  private settingsChanged = new Subject<AccessibilitySettings>();
  private currentSettings: AccessibilitySettings = {
    fontSize: 'medium',
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    focusVisible: true,
  };

  settingsChanged$ = this.settingsChanged.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initializeAccessibility();
    this.setupKeyboardNavigation();
    this.detectUserPreferences();
  }

  /**
   * Initialize accessibility features
   */
  private initializeAccessibility() {
    // Apply initial settings
    this.applySettings(this.currentSettings);
    
    // Listen for keyboard navigation
    this.setupKeyboardNavigationDetection();
    
    // Setup focus management
    this.setupFocusManagement();
  }

  /**
   * Update accessibility settings
   */
  updateSettings(settings: Partial<AccessibilitySettings>) {
    this.currentSettings = { ...this.currentSettings, ...settings };
    this.applySettings(this.currentSettings);
    this.settingsChanged.next(this.currentSettings);
  }

  /**
   * Get current accessibility settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.currentSettings };
  }

  /**
   * Apply accessibility settings to the document
   */
  private applySettings(settings: AccessibilitySettings) {
    const body = document.body;
    
    // Clear existing accessibility classes
    this.renderer.removeClass(body, 'font-size-small');
    this.renderer.removeClass(body, 'font-size-medium');
    this.renderer.removeClass(body, 'font-size-large');
    this.renderer.removeClass(body, 'font-size-extra-large');
    this.renderer.removeClass(body, 'high-contrast');
    this.renderer.removeClass(body, 'reduced-motion');
    this.renderer.removeClass(body, 'screen-reader-mode');
    this.renderer.removeClass(body, 'keyboard-nav');
    this.renderer.removeClass(body, 'focus-visible-enabled');

    // Apply font size
    this.renderer.addClass(body, `font-size-${settings.fontSize}`);
    
    // Apply high contrast
    if (settings.highContrast) {
      this.renderer.addClass(body, 'high-contrast');
    }
    
    // Apply reduced motion
    if (settings.reducedMotion) {
      this.renderer.addClass(body, 'reduced-motion');
    }
    
    // Apply screen reader mode
    if (settings.screenReader) {
      this.renderer.addClass(body, 'screen-reader-mode');
    }
    
    // Apply keyboard navigation indicators
    if (settings.keyboardNavigation) {
      this.renderer.addClass(body, 'keyboard-nav');
    }
    
    // Apply focus visible
    if (settings.focusVisible) {
      this.renderer.addClass(body, 'focus-visible-enabled');
    }

    // Update CSS custom properties
    this.updateCSSProperties(settings);
  }

  /**
   * Update CSS custom properties for accessibility
   */
  private updateCSSProperties(settings: AccessibilitySettings) {
    const root = document.documentElement;
    
    // Font size mapping
    const fontSizes = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px',
    };
    
    this.renderer.setStyle(root, '--base-font-size', fontSizes[settings.fontSize]);
    
    // High contrast colors
    if (settings.highContrast) {
      this.renderer.setStyle(root, '--text-color', '#000000');
      this.renderer.setStyle(root, '--bg-color', '#FFFFFF');
      this.renderer.setStyle(root, '--border-color', '#000000');
      this.renderer.setStyle(root, '--focus-color', '#0000FF');
    }
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation() {
    // Add keyboard navigation styles
    const style = document.createElement('style');
    style.textContent = `
      /* Keyboard Navigation Styles */
      .keyboard-nav *:focus {
        outline: 2px solid #4F46E5 !important;
        outline-offset: 2px !important;
      }
      
      .focus-visible-enabled *:focus-visible {
        outline: 2px solid #4F46E5 !important;
        outline-offset: 2px !important;
      }
      
      /* High Contrast Styles */
      .high-contrast {
        background: #FFFFFF !important;
        color: #000000 !important;
      }
      
      .high-contrast * {
        background-color: inherit !important;
        color: inherit !important;
        border-color: #000000 !important;
      }
      
      .high-contrast button,
      .high-contrast input,
      .high-contrast select,
      .high-contrast textarea {
        background: #FFFFFF !important;
        color: #000000 !important;
        border: 2px solid #000000 !important;
      }
      
      /* Reduced Motion */
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      
      /* Font Size Classes */
      .font-size-small { font-size: 14px; }
      .font-size-medium { font-size: 16px; }
      .font-size-large { font-size: 18px; }
      .font-size-extra-large { font-size: 20px; }
      
      /* Screen Reader Only Content */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      
      /* Skip to main content link */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #4F46E5;
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
      }
      
      .skip-link:focus {
        top: 6px;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup keyboard navigation detection
   */
  private setupKeyboardNavigationDetection() {
    let mouseTimer: any;
    
    fromEvent(document, 'mousedown').pipe(
      debounceTime(100)
    ).subscribe(() => {
      // Mouse detected, remove keyboard navigation indicators
      document.body.classList.remove('keyboard-nav');
      clearTimeout(mouseTimer);
    });
    
    fromEvent(document, 'keydown').pipe(
      filter((event: Event) => (event as KeyboardEvent).key === 'Tab'),
      debounceTime(100)
    ).subscribe(() => {
      // Keyboard detected, add keyboard navigation indicators
      document.body.classList.add('keyboard-nav');
      clearTimeout(mouseTimer);
      
      // Remove keyboard indicators after mouse inactivity
      mouseTimer = setTimeout(() => {
        document.body.classList.remove('keyboard-nav');
      }, 5000);
    });
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement() {
    // Add skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Ensure main content has id
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent && !mainContent.id) {
      mainContent.id = 'main-content';
    }
  }

  /**
   * Detect user preferences from system
   */
  private detectUserPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.updateSettings({ reducedMotion: true });
    }
    
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.updateSettings({ highContrast: true });
    }
    
    // Listen for changes in preferences
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.updateSettings({ reducedMotion: e.matches });
    });
    
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.updateSettings({ highContrast: e.matches });
    });
  }

  /**
   * Announce messages to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Focus an element with proper scrolling
   */
  focusElement(element: HTMLElement, options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }) {
    if (element) {
      element.focus();
      element.scrollIntoView(options);
    }
  }

  /**
   * Trap focus within a container (for modals, dropdowns, etc.)
   */
  trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }
}
