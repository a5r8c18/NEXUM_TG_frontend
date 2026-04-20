import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-support-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Support Button -->
    <button
      (click)="openWhatsApp()"
      class="fixed bottom-24 right-4 z-41 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-medium transition-all bg-green-500 hover:bg-green-600 text-white"
      title="Contactar soporte por WhatsApp"
    >
      <!-- WhatsApp Icon -->
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      <span>Soporte</span>
    </button>

    <!-- Tooltip (opcional) -->
    @if (showTooltip()) {
      <div class="fixed bottom-36 right-4 z-42 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
        <div class="font-medium mb-1">¿Necesitas ayuda?</div>
        <div class="text-slate-300">Contacta a nuestro equipo de soporte</div>
        <!-- Arrow -->
        <div class="absolute -bottom-1 right-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
      </div>
    }
  `
})
export class SupportButtonComponent {
  showTooltip = signal(false);

  constructor() {
    // Mostrar tooltip después de 2 segundos
    setTimeout(() => {
      this.showTooltip.set(true);
      // Ocultar después de 5 segundos
      setTimeout(() => {
        this.showTooltip.set(false);
      }, 5000);
    }, 2000);
  }

  openWhatsApp(): void {
    // Número de WhatsApp de soporte (configurable)
    const supportNumber = '593999999999'; // Reemplazar con número real
    const message = encodeURIComponent('Hola, necesito soporte con el sistema NEXUM');
    
    // Abrir WhatsApp Web
    const whatsappUrl = `https://wa.me/${supportNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }
}
