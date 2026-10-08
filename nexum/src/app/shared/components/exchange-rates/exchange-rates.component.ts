import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-exchange-rates',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative exchange-rates-container">
      <button
        (click)="toggle(); $event.stopPropagation()"
        [class]="buttonClasses()"
        title="Tasas de cambio USD">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </button>

      @if (isOpen()) {
        <div [class]="panelClasses()">
          <div [class]="headerClasses()">
            <h3 [class]="titleClasses()">Tasa de cambio USD</h3>
            <button (click)="refresh(); $event.stopPropagation()"
                    [disabled]="rates.loading()"
                    class="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50">
              {{ rates.loading() ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>

          @if (rates.error(); as err) {
            <div class="px-4 py-3 text-xs text-red-500">{{ err }}</div>
          }

          @if (rates.rates(); as r) {
            <div class="py-1">
              <div [class]="rowClasses()">
                <div>
                  <p [class]="labelClasses()">Segmento III</p>
                  <p [class]="subClasses()">Tasa especial BCC</p>
                </div>
                <p [class]="valueClasses()">{{ fmt(r.segmentoIII) }}</p>
              </div>
              <div [class]="rowClasses()">
                <div>
                  <p [class]="labelClasses()">Gobierno</p>
                  <p [class]="subClasses()">Tasa oficial BCC (Seg. I)</p>
                </div>
                <p [class]="valueClasses()">{{ fmt(r.segmentoI) }}</p>
              </div>
              <div [class]="rowClasses()">
                <div>
                  <p [class]="labelClasses()">Informal</p>
                  <p [class]="subClasses()">Mercado informal (elToque)</p>
                </div>
                <p [class]="valueClasses()">{{ fmt(r.informal) }}</p>
              </div>
            </div>
            <div [class]="footerClasses()">
              @if (r.fechaBcc) {
                <p>BCC: {{ r.fechaBcc | date:'dd/MM/yyyy' }}</p>
              }
              @if (r.fechaInformal) {
                <p>elToque: {{ r.fechaInformal | date:'dd/MM/yyyy' }}</p>
              }
            </div>
          } @else if (rates.loading()) {
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-6 w-6 border-2 border-slate-600 border-t-blue-500"></div>
            </div>
          } @else {
            <div class="px-4 py-6 text-center text-xs text-slate-400">
              Sin datos disponibles
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class ExchangeRatesComponent {
  rates = inject(ExchangeRateService);
  private themeService = inject(ThemeService);

  isOpen = signal(false);

  toggle(): void {
    const open = !this.isOpen();
    this.isOpen.set(open);
    if (open) this.rates.load();
  }

  refresh(): void {
    this.rates.load(true);
  }

  fmt(v: number | null): string {
    return v === null ? '—' : `${v.toFixed(2)} CUP`;
  }

  buttonClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors'
      : 'p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors';
  }

  panelClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-black/10 overflow-hidden z-50'
      : 'absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/30 overflow-hidden z-50';
  }

  headerClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'px-4 py-3 border-b border-slate-200 flex items-center justify-between'
      : 'px-4 py-3 border-b border-slate-700 flex items-center justify-between';
  }

  titleClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'text-sm font-semibold text-slate-900'
      : 'text-sm font-semibold text-white';
  }

  rowClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'px-4 py-2.5 flex items-center justify-between border-b border-slate-100 last:border-b-0'
      : 'px-4 py-2.5 flex items-center justify-between border-b border-slate-700/50 last:border-b-0';
  }

  labelClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'text-sm font-medium text-slate-900'
      : 'text-sm font-medium text-white';
  }

  subClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'text-[11px] text-slate-500'
      : 'text-[11px] text-slate-400';
  }

  valueClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'text-sm font-bold text-slate-900 tabular-nums'
      : 'text-sm font-bold text-white tabular-nums';
  }

  footerClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'px-4 py-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between'
      : 'px-4 py-2 border-t border-slate-700 text-[10px] text-slate-500 flex justify-between';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.exchange-rates-container') && this.isOpen()) {
      this.isOpen.set(false);
    }
  }
}
