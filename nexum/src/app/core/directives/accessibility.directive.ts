import { Directive, ElementRef, Renderer2, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appAccessibility]',
})
export class AccessibilityDirective {
  @Input() ariaLabel?: string;
  @Input() ariaDescribedBy?: string;
  @Input() role?: string;
  @Input() tabIndex?: number;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {
    this.applyAccessibilityAttributes();
  }

  private applyAccessibilityAttributes() {
    const element = this.el.nativeElement;

    // Apply ARIA attributes
    if (this.ariaLabel) {
      this.renderer.setAttribute(element, 'aria-label', this.ariaLabel);
    }
    
    if (this.ariaDescribedBy) {
      this.renderer.setAttribute(element, 'aria-describedby', this.ariaDescribedBy);
    }
    
    if (this.role) {
      this.renderer.setAttribute(element, 'role', this.role);
    }
    
    if (this.tabIndex !== undefined) {
      this.renderer.setAttribute(element, 'tabindex', this.tabIndex.toString());
    }

    // Add focus management
    this.renderer.addClass(element, 'accessible-element');
  }

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onEnterOrSpace(event: any) {
    // For buttons and interactive elements, trigger click on Enter/Space
    const element = this.el.nativeElement;
    if (element.tagName === 'BUTTON' || this.role === 'button') {
      event.preventDefault();
      element.click();
    }
  }

  @HostListener('focus')
  onFocus() {
    this.renderer.addClass(this.el.nativeElement, 'focused');
  }

  @HostListener('blur')
  onBlur() {
    this.renderer.removeClass(this.el.nativeElement, 'focused');
  }
}
