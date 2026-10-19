import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './customer-list.component.html',
})
export class CustomerListComponent implements OnInit {
  private financeService = inject(FinanceService);
  private confirmDialog = inject(ConfirmDialogService);

  customers = signal<any[]>([]);
  isLoading = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
  searchTerm = signal('');

  isModalOpen = signal(false);
  editing = signal<any | null>(null);

  form = { code: '', reeupCode: '', name: '', abbreviation: '', address: '', email: '', phone: '', taxId: '', ircc: '', province: '', country: 'Cuba' };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.financeService.getCustomers().subscribe({
      next: (data) => { this.customers.set(Array.isArray(data) ? data : []); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('Error cargando clientes', 'error'); },
    });
  }

  filtered(): any[] {
    const q = this.searchTerm().toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter(c =>
      c.name?.toLowerCase().includes(q) || c.taxId?.toLowerCase().includes(q));
  }

  openCreate(): void {
    this.editing.set(null);
    this.form = { code: '', reeupCode: '', name: '', abbreviation: '', address: '', email: '', phone: '', taxId: '', ircc: '', province: '', country: 'Cuba' };
    this.isModalOpen.set(true);
  }

  openEdit(c: any): void {
    this.editing.set(c);
    this.form = {
      code: c.code, reeupCode: c.reeupCode || '', name: c.name, abbreviation: c.abbreviation || '',
      address: c.address || '', email: c.email || '', phone: c.phone || '', taxId: c.taxId || '',
      ircc: c.ircc || '', province: c.province || '', country: c.country || 'Cuba',
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editing.set(null);
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.showToast('El nombre es obligatorio', 'error');
      return;
    }
    const e = this.editing();
    const req$ = e
      ? this.financeService.updateCustomer(e.id, this.form)
      : this.financeService.createCustomer(this.form);
    req$.subscribe({
      next: () => { this.closeModal(); this.load(); this.showToast(e ? 'Cliente actualizado' : 'Cliente creado', 'success'); },
      error: () => this.showToast('Error guardando el cliente', 'error'),
    });
  }

  async remove(c: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar cliente',
      message: `¿Eliminar el cliente "${c.name}"?`,
      confirmText: 'Eliminar',
      type: 'danger',
    });
    if (!confirmed) return;
    this.financeService.deleteCustomer(c.id).subscribe({
      next: () => { this.load(); this.showToast('Cliente eliminado', 'success'); },
      error: () => this.showToast('Error eliminando el cliente', 'error'),
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
