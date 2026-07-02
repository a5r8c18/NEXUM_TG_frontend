import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PhysicalCountService } from '../../../core/services/physical-count.service';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationComponent, PaginationConfig } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-physical-count',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
  templateUrl: './physical-count.component.html',
})
export class PhysicalCountComponent implements OnInit, OnDestroy {
  private physicalCountService = inject(PhysicalCountService);
  private warehouseService = inject(WarehouseService);
  private notificationService = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  items = signal<any[]>([]);
  stats = signal<any>(null);
  warehouses = signal<any[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  statusFilter = signal('');
  warehouseFilter = signal('');
  fromDate = signal('');
  toDate = signal('');
  currentPage = signal(1);
  pageSize = 20;

  isCreateOpen = signal(false);
  formError = signal('');
  newCount: any = { warehouseId: '', notes: '' };

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  filteredItems = computed(() => {
    let list = this.items();
    const status = this.statusFilter();
    if (status) list = list.filter(c => c.status === status);
    const wh = this.warehouseFilter();
    if (wh) list = list.filter(c => c.warehouseId === wh || c.warehouse?.id === wh);
    const from = this.fromDate();
    if (from) list = list.filter(c => new Date(c.createdAt) >= new Date(from));
    const to = this.toDate();
    if (to) list = list.filter(c => new Date(c.createdAt) <= new Date(to + 'T23:59:59'));
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
    this.loadWarehouses();
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

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data: any) => this.warehouses.set(Array.isArray(data) ? data : (data?.data ?? [])),
      error: () => this.warehouses.set([]),
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.physicalCountService.getAll({
      status: this.statusFilter() || undefined,
      warehouseId: this.warehouseFilter() || undefined,
      startDate: this.fromDate() || undefined,
      endDate: this.toDate() || undefined,
    }).subscribe({
      next: (data: any) => {
        this.items.set(Array.isArray(data) ? data : (data?.data ?? data?.items ?? []));
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => { this.hasError.set(true); this.isLoading.set(false); },
    });
  }

  loadStats(): void {
    this.physicalCountService.getStatistics().subscribe({
      next: (s: any) => this.stats.set(s),
      error: () => {},
    });
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onWarehouseChange(event: Event): void {
    this.warehouseFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onFromDateChange(event: Event): void {
    this.fromDate.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onToDateChange(event: Event): void {
    this.toDate.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  openCreate(): void {
    this.newCount = { warehouseId: '', notes: '' };
    this.formError.set('');
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    this.isCreateOpen.set(false);
    this.formError.set('');
  }

  saveCount(): void {
    if (!this.newCount.warehouseId) {
      this.formError.set('Debe seleccionar un almacen');
      return;
    }
    this.formError.set('');
    this.physicalCountService.create(this.newCount).subscribe({
      next: () => {
        this.closeCreate();
        this.loadData();
        this.loadStats();
        this.showToast('Conteo fisico creado exitosamente', 'success');
      },
      error: (err: any) => this.formError.set(err?.error?.message || 'Error al crear conteo'),
    });
  }

  async startCount(count: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Iniciar conteo',
      message: `Iniciar el conteo fisico del almacen "${count.warehouse?.name || count.warehouseName}"?`,
      confirmText: 'Iniciar',
      type: 'info',
    });
    if (!confirmed) return;
    this.physicalCountService.startCount(count.id).subscribe({
      next: () => { this.loadData(); this.showToast('Conteo iniciado', 'success'); },
      error: () => this.showToast('Error al iniciar conteo', 'error'),
    });
  }

  async completeCount(count: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Completar conteo',
      message: 'Marcar este conteo como completado?',
      confirmText: 'Completar',
      type: 'info',
    });
    if (!confirmed) return;
    this.physicalCountService.completeCount(count.id).subscribe({
      next: () => { this.loadData(); this.showToast('Conteo completado', 'success'); },
      error: () => this.showToast('Error al completar conteo', 'error'),
    });
  }

  async approveCount(count: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Aprobar conteo',
      message: 'Aprobar este conteo? Se aplicaran los ajustes de inventario.',
      confirmText: 'Aprobar',
      type: 'warning',
    });
    if (!confirmed) return;
    this.physicalCountService.approveCount(count.id).subscribe({
      next: () => { this.loadData(); this.loadStats(); this.showToast('Conteo aprobado y ajustes aplicados', 'success'); },
      error: () => this.showToast('Error al aprobar conteo', 'error'),
    });
  }

  async cancelCount(count: any): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cancelar conteo',
      message: 'Cancelar este conteo fisico? Esta accion no se puede deshacer.',
      confirmText: 'Cancelar conteo',
      type: 'danger',
    });
    if (!confirmed) return;
    this.physicalCountService.cancelCount(count.id).subscribe({
      next: () => { this.loadData(); this.showToast('Conteo cancelado', 'success'); },
      error: () => this.showToast('Error al cancelar conteo', 'error'),
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      in_progress: 'En Progreso',
      completed: 'Completado',
      approved: 'Aprobado',
      cancelled: 'Cancelado',
    };
    return map[status] || status;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
