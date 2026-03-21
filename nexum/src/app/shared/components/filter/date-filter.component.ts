import { Component, signal, output, input } from '@angular/core';

export interface FilterValues {
  startDate?: string;
  endDate?: string;
  name?: string;
  code?: string;
  expirationDate?: string;
}

@Component({
  selector: 'app-date-filter',
  standalone: true,
  templateUrl: './date-filter.component.html'
})
export class DateFilterComponent {
  // Señales para los valores de los filtros
  startDate = signal<string>('');
  endDate = signal<string>('');
  name = signal<string>('');
  code = signal<string>('');
  expirationDate = signal<string>('');

  // Output para emitir los valores de los filtros
  filtersChange = output<FilterValues>();

  // Input para recibir los filtros activos (opcional)
  activeFilters = input<Partial<FilterValues>>({});

  constructor() {
    // Inicializar con los filtros activos si se proporcionan
    const active = this.activeFilters();
    if (active.startDate) this.startDate.set(active.startDate);
    if (active.endDate) this.endDate.set(active.endDate);
    if (active.name) this.name.set(active.name);
    if (active.code) this.code.set(active.code);
    if (active.expirationDate) this.expirationDate.set(active.expirationDate);
  }

  onFilterChange(): void {
    this.filtersChange.emit({
      startDate: this.startDate(),
      endDate: this.endDate(),
      name: this.name(),
      code: this.code(),
      expirationDate: this.expirationDate()
    });
  }

  clearFilters(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.name.set('');
    this.code.set('');
    this.expirationDate.set('');
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return !!(this.startDate() || this.endDate() || this.name() || this.code() || this.expirationDate());
  }
}
