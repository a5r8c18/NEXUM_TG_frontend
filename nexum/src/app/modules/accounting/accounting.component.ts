import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { AccountingService, JournalEntry } from '../../core/services/accounting.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './accounting.component.html'
})
export class AccountingComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private confirmDialog = inject(ConfirmDialogService);

  entries = signal<JournalEntry[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  statusFilter = signal('');
  isCreateOpen = signal(false);

  filteredEntries = computed(() => {
    let filtered = this.entries();
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(term) ||
        e.entryNumber.toLowerCase().includes(term) ||
        e.accountName.toLowerCase().includes(term)
      );
    }
    if (this.statusFilter()) {
      filtered = filtered.filter(e => e.status === this.statusFilter());
    }
    return filtered;
  });

  pagedEntries = computed(() => {
    const filtered = this.filteredEntries();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredEntries().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredEntries().length / this.pageSize)
  }));

  ngOnInit() {
    this.loadEntries();
  }

  loadEntries() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.accountingService.getEntries().subscribe({
      next: (data) => { this.entries.set(data); this.isLoading.set(false); },
      error: () => { this.hasError.set(true); this.isLoading.set(false); }
    });
  }

  applyFilters() { this.currentPage.set(1); }
  resetFilters() { this.searchTerm.set(''); this.statusFilter.set(''); this.currentPage.set(1); }
  onPageChange(page: number) { this.currentPage.set(page); }
  openCreate() { this.isCreateOpen.set(true); }
  closeCreate() { this.isCreateOpen.set(false); }

  createEntry() {
    this.showToast('Funcionalidad de crear asiento en desarrollo', 'info');
    this.closeCreate();
  }

  postEntry(entry: JournalEntry) {
    this.accountingService.updateEntryStatus(entry.id, 'posted').subscribe({
      next: () => { this.showToast('Asiento contabilizado', 'success'); this.loadEntries(); },
      error: () => this.showToast('Error al contabilizar', 'error')
    });
  }

  cancelEntry(entry: JournalEntry) {
    this.accountingService.updateEntryStatus(entry.id, 'cancelled').subscribe({
      next: () => { this.showToast('Asiento anulado', 'success'); this.loadEntries(); },
      error: () => this.showToast('Error al anular', 'error')
    });
  }

  async deleteEntry(entry: JournalEntry) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar asiento',
      message: `¿Eliminar asiento ${entry.entryNumber}?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.accountingService.deleteEntry(entry.id).subscribe({
      next: () => { this.showToast('Asiento eliminado', 'success'); this.loadEntries(); },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'posted': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'posted': return 'Contabilizado';
      case 'cancelled': return 'Anulado';
      default: return status;
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
