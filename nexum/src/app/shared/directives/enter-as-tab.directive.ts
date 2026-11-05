import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Enter = Tab para captura rápida de datos (patrón usado por contadores).
 *
 * Uso: aplicar en el contenedor del formulario:
 *   <form appEnterAsTab> ... </form>
 *   <div appEnterAsTab> ... </div>
 *
 * - Enter mueve el foco al siguiente elemento editable del contenedor.
 * - Shift+Enter vuelve al elemento anterior.
 * - Se ignoran textareas y selects (Enter mantiene su comportamiento nativo).
 * - Se saltan elementos disabled, readonly u ocultos.
 * - Si no hay siguiente campo, Enter sigue el comportamiento por defecto
 *   (submit del formulario si existe).
 */
@Directive({
  selector: '[appEnterAsTab]',
  standalone: true,
})
export class EnterAsTabDirective {
  private el: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    // textarea y select: Enter tiene comportamiento propio
    if (tag === 'textarea' || tag === 'select') {
      return;
    }

    // Botones y submit: Enter debe activarlos normalmente
    if (tag === 'button' || (tag === 'input' && (target as HTMLInputElement).type === 'submit')) {
      return;
    }

    const focusables = this.getFocusables();
    const index = focusables.indexOf(target);
    if (index === -1) {
      return;
    }

    const next = event.shiftKey
      ? focusables[index - 1]
      : focusables[index + 1];

    if (!next) {
      // Sin siguiente campo: dejar que Enter haga submit si es un form
      return;
    }

    event.preventDefault();
    next.focus();
    if (next instanceof HTMLInputElement && next.type === 'text') {
      next.select();
    }
  }

  private getFocusables(): HTMLElement[] {
    const selector =
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea, button';
    const nodes: NodeListOf<HTMLElement> =
      this.el.nativeElement.querySelectorAll(selector);
    return Array.from(nodes).filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        !el.hasAttribute('readonly') &&
        el.offsetParent !== null, // visible en pantalla
    );
  }
}
