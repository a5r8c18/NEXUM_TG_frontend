import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import { ModalComponent } from '../modal/modal.component';

/**
 * Alta rápida de cliente/entidad desde un buscador ("+ Crear ..."), con la
 * misma ficha que Facturación. Debe colocarse fuera de otros modales.
 */
@Component({
  selector: 'app-customer-quick-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './customer-quick-create.component.html',
})
export class CustomerQuickCreateComponent implements OnChanges {
  private financeService = inject(FinanceService);

  @Input() isOpen = false;
  /** Nombre escrito en el buscador, para precargar la ficha. */
  @Input() name = '';
  @Output() created = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  form: any = this.emptyForm();
  saving = signal(false);
  error = signal('');

  private emptyForm() {
    return { reeupCode: '', name: '', abbreviation: '', address: '', email: '', phone: '', taxId: '', ircc: '', province: '', country: 'Cuba' };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.form = { ...this.emptyForm(), name: (this.name || '').trim() };
      this.error.set('');
    }
  }

  save(): void {
    if (!this.form.name?.trim()) {
      this.error.set('El nombre es obligatorio');
      return;
    }
    this.saving.set(true);
    this.financeService.createCustomer({ ...this.form, name: this.form.name.trim() }).subscribe({
      next: (customer: any) => {
        this.saving.set(false);
        this.created.emit(customer);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Error al crear el cliente');
      },
    });
  }
}
