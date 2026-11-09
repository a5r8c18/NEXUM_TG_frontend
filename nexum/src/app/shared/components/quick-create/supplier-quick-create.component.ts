import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuppliersService } from '../../../core/services/suppliers.service';
import { ModalComponent } from '../modal/modal.component';

/**
 * Alta rápida de proveedor desde un buscador ("+ Crear ..."), con la misma
 * ficha que Inventario. Debe colocarse fuera de otros modales.
 */
@Component({
  selector: 'app-supplier-quick-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './supplier-quick-create.component.html',
})
export class SupplierQuickCreateComponent implements OnChanges {
  private suppliersService = inject(SuppliersService);

  @Input() isOpen = false;
  /** Nombre escrito en el buscador, para precargar la ficha. */
  @Input() name = '';
  @Output() created = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  form: any = this.emptyForm();
  saving = signal(false);
  error = signal('');

  private emptyForm() {
    return { reeupCode: '', businessName: '', tradeName: '', nit: '', ircc: '', province: '', country: 'Cuba', contactPhone: '', contactEmail: '', address: '', city: '' };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.form = { ...this.emptyForm(), businessName: (this.name || '').trim() };
      this.error.set('');
    }
  }

  save(): void {
    if (!this.form.businessName?.trim()) {
      this.error.set('El nombre es obligatorio');
      return;
    }
    this.saving.set(true);
    this.suppliersService.create({ ...this.form, businessName: this.form.businessName.trim() }).subscribe({
      next: (supplier: any) => {
        this.saving.set(false);
        this.created.emit(supplier);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Error al crear el proveedor');
      },
    });
  }
}
