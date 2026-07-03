import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinanceService } from '../../../core/services/finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-receivables',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './receivables.component.html',
})
export class ReceivablesComponent implements OnInit, OnDestroy {
  private financeService = inject(FinanceService);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  searchTerm = signal('');
  statusFilter = signal('');
  agingFilter = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  isEditOpen = signal(false);
  selectedReceivable = signal<any>(null);
  formError = signal('');

  newReceivable: any = { customerName: '', customerId: '', originalAmount: 0, dueDate: '', description: '' };
  editReceivable: any = {};

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.items();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      list = list.filter(ar =>
        ar.customerName?.toLowerCase().includes(term) ||
        ar.arNumber?.toLowerCase().includes(term) ||
        ar.customerId?.toLowerCase().includes(term)
      );
    }
    const status = this.statusFilter();
    if (status) list = list.filter(ar => ar.status === status);
    const aging = this.agingFilter();
    if (aging) list = list.filter(ar => ar.agingCategory === aging);
    return list;
  });

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredItems().length,
    pageSize: this.pageSize,
    totalPages: Math.ceil(this.filteredItems().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  ngOnInit(): void {
    this.loadData();
    this.loadStats();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => {
      this.loadData();
      this.loadStats();
    });
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.financeService.getReceivables().subscribe({
      next: (data: any) => {
        this.items.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.financeService.getReceivableStats().subscribe({
      next: (s: any) => this.stats.set(s),
      error: () => {},
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  openCreate(): void {
    this.newReceivable = { customerName: '', customerId: '', originalAmount: 0, dueDate: '', description: '' };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveReceivable(): void {
    if (!this.newReceivable.customerName?.trim() || !this.newReceivable.originalAmount || !this.newReceivable.dueDate) {
      this.formError.set('Cliente, monto y fecha de vencimiento son obligatorios');
      return;
    }
    this.formError.set('');
    this.financeService.createReceivable(this.newReceivable).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Cuenta por cobrar creada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear cuenta por cobrar'),
    });
  }

  openEdit(receivable: any): void {
    this.selectedReceivable.set(receivable);
    this.editReceivable = { ...receivable };
    this.formError.set('');
    this.isEditOpen.set(true);
  }

  closeEdit(): void {
    this.isEditOpen.set(false);
    this.selectedReceivable.set(null);
    this.formError.set('');
  }

  updateReceivable(): void {
    if (!this.editReceivable.customerName?.trim()) {
      this.formError.set('Cliente es obligatorio');
      return;
    }
    this.formError.set('');
    this.financeService.updateReceivable(this.selectedReceivable()!.id, this.editReceivable).subscribe({
      next: () => {
        this.closeEdit();
        this.loadData();
        this.showToast('Cuenta por cobrar actualizada exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al actualizar cuenta por cobrar'),
    });
  }

  async markAsPaid(receivable: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Marcar como pagada',
      message: `Marcar "${receivable.customerName}" como pagada?`,
      confirmText: 'Confirmar',
      type: 'warning',
    });
    if (!confirmed) return;
    this.editReceivable = { ...receivable, status: 'paid' };
    this.selectedReceivable.set(receivable);
    this.updateReceivable();
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada', overdue: 'Vencida', written_off: 'Incobrable', disputed: 'Disputada' };
    return map[status] || status;
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('es-CU', { style: 'currency', currency: 'CUP' }).format(value);
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CU');
  }
}
