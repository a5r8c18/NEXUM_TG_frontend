import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService, Voucher } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-pending-vouchers',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  template: `
    <div class="p-6">
      @if (toast()) {
        <div class="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border"
             [class.bg-green-50]="toast()?.type === 'success'"
             [class.text-green-800]="toast()?.type === 'success'"
             [class.border-green-200]="toast()?.type === 'success'"
             [class.bg-red-50]="toast()?.type === 'error'"
             [class.text-red-800]="toast()?.type === 'error'"
             [class.border-red-200]="toast()?.type === 'error'">
          {{ toast()?.message }}
        </div>
      }

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold dark:text-white">Comprobantes Pendientes</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Visto bueno manual antes de contabilizar. Los comprobantes generados por módulos no son editables.</p>
        </div>
        <button (click)="loadData()" class="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm dark:bg-slate-800 dark:text-slate-300">Actualizar</button>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-20 text-slate-500"><span>Cargando...</span></div>
      } @else if (comprobantes().length === 0) {
        <div class="text-center py-20 text-slate-500 dark:text-slate-400">No hay comprobantes pendientes</div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Número</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Origen</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Descripción</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Total</th>
                <th class="center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (c of pagedComprobantes(); track c.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3 font-mono text-xs dark:text-slate-300">{{ c.voucherNumber }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ c.date }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ getSourceLabel(c.sourceModule) }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ c.description }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ c.totalAmount | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-center">
                    <button (click)="viewDetail(c)" class="bg-slate-600 text-white px-3 py-1 rounded text-xs hover:bg-slate-700 transition-colors mr-1">Detalle</button>
                    <button (click)="post(c.id)" class="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors mr-1">Contabilizar</button>
                    <button (click)="cancel(c.id)" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors">Anular</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (paginationConfig().totalPages > 1) {
          <div class="mt-6">
            <app-pagination [config]="paginationConfig()" (pageChange)="onPageChange($event)" />
          </div>
        }
      }

      @if (showDetail() && selectedComprobante()) {
        <app-modal [isOpen]="showDetail()" (closeEvent)="showDetail.set(false)" title="Detalle del Comprobante" confirmText="Cerrar" confirmButtonClass="bg-slate-600 hover:bg-slate-700">
          <div class="space-y-2 text-sm">
            <p><strong>Número:</strong> {{ selectedComprobante()?.voucherNumber }}</p>
            <p><strong>Descripción:</strong> {{ selectedComprobante()?.description }}</p>
            <p><strong>Origen:</strong> {{ getSourceLabel(selectedComprobante()?.sourceModule) }}</p>
            <p><strong>Estado:</strong> {{ selectedComprobante()?.status }}</p>
            <div class="overflow-x-auto mt-2">
              <table class="w-full text-xs border">
                <thead class="bg-slate-50"><tr><th class="text-left px-2 py-1">Cuenta</th><th class="text-right px-2 py-1">Debe</th><th class="text-right px-2 py-1">Haber</th></tr></thead>
                <tbody>
                  @for (line of selectedComprobante()?.lines; track line.id) {
                    <tr class="border-t"><td class="px-2 py-1">{{ line.accountCode }} - {{ line.description }}</td><td class="px-2 py-1 text-right">{{ line.debit | number:'1.2-2' }}</td><td class="px-2 py-1 text-right">{{ line.credit | number:'1.2-2' }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `
})
export class PendingVouchersComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private confirmDialog = inject(ConfirmDialogService);

  comprobantes = signal<Voucher[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  pageSize = 10;
  selectedComprobante = signal<Voucher | null>(null);
  showDetail = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  pagedComprobantes = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.comprobantes().slice(start, start + this.pageSize);
  });

  paginationConfig = computed<PaginationConfig>(() => ({
    currentPage: this.currentPage(),
    totalItems: this.comprobantes().length,
    totalPages: Math.ceil(this.comprobantes().length / this.pageSize),
    itemsPerPage: this.pageSize,
  }));

  ngOnInit() { this.loadData(); }

  loadData() {
    this.isLoading.set(true);
    this.accountingService.getPendingVouchers().subscribe({
      next: (data) => { this.comprobantes.set(data || []); this.currentPage.set(1); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.showToast('Error cargando pendientes', 'error'); }
    });
  }

  onPageChange(page: number) { this.currentPage.set(page); }

  getSourceLabel(source?: string): string {
    const labels: Record<string, string> = {
      manual: 'Manual',
      inventory: 'Inventario',
      invoices: 'Facturación',
      'fixed-assets': 'Activos Fijos',
      hr: 'Nómina',
      finance: 'Finanzas',
      payroll: 'Nómina',
    };
    return labels[source || ''] || (source || '—');
  }

  viewDetail(c: Voucher) { this.selectedComprobante.set(c); this.showDetail.set(true); }

  async post(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Contabilizar comprobante',
      message: '¿Contabilizar este comprobante?',
      confirmText: 'Contabilizar',
      type: 'success',
    });
    if (!confirmed) return;
    this.accountingService.updateVoucherStatus(id, 'posted').subscribe({
      next: () => { this.showToast('Comprobante contabilizado', 'success'); this.loadData(); },
      error: (err) => this.showToast(err?.error?.message || 'Error al contabilizar', 'error'),
    });
  }

  async cancel(id: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Anular comprobante',
      message: '¿Anular este comprobante?',
      confirmText: 'Anular',
      type: 'danger',
    });
    if (!confirmed) return;
    this.accountingService.updateVoucherStatus(id, 'cancelled').subscribe({
      next: () => { this.showToast('Comprobante anulado', 'success'); this.loadData(); },
      error: (err) => this.showToast(err?.error?.message || 'Error al anular', 'error'),
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
