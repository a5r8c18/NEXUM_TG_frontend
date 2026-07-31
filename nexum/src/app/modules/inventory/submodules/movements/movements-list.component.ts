import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, lastValueFrom } from 'rxjs';
import { MovementsService } from '../../../../core/services/movements.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { WarehouseService } from '../../../../core/services/warehouse.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { MovementItem, MovementFilters, DirectEntryDto, ExitDto, TransferDto, ReturnDto, MovementTypeOption, InventoryCategory } from '../../../../models/inventory.models';
import { CreatePurchasePayload } from '../../../../models/purchase.models';
import { OfflineFirstService } from '../../../../core/offline/offline-first.service';
import { EntryWizardComponent } from './components/entry-wizard/entry-wizard.component';
import { ExitFormComponent } from './components/exit-form/exit-form.component';
import { TransferFormComponent } from './components/transfer-form/transfer-form.component';
import { TransferWizardComponent } from './components/transfer-wizard/transfer-wizard.component';
import { ReturnWizardComponent } from './components/return-wizard/return-wizard.component';
import { ExportComponentComponent, ExportData } from '../../../../shared/components/export/export-component.component';

@Component({
  selector: 'app-movements-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PaginationComponent,
    EntryWizardComponent, ExitFormComponent, TransferFormComponent, TransferWizardComponent, ReturnWizardComponent, ExportComponentComponent
  ],
  templateUrl: './movements-list.component.html',
})
export class MovementsListComponent implements OnInit, OnDestroy {
  private movementsService = inject(MovementsService);
  private inventoryService = inject(InventoryService);
  private warehouseService = inject(WarehouseService);
  private notificationService = inject(NotificationService);
  private offlineFirst = inject(OfflineFirstService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  movements = signal<MovementItem[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Movement type catalog
  entryTypes = signal<MovementTypeOption[]>([]);
  exitTypes = signal<MovementTypeOption[]>([]);

  currentPage = signal(1);
  pageSize = 15;
  totalItems = signal(0);
  totalPages = signal(0);

  searchTerm = signal('');
  fromDate = signal('');
  toDate = signal('');

  // --- Sub-component state ---
  isEntryWizardOpen = signal(false);
  isExitFormOpen = signal(false);
  isTransferWizardOpen = signal(false);
  isTransferFormOpen = signal(false);
  selectedForExit: MovementItem | null = null;
  selectedForTransfer: MovementItem | null = null;

  // --- Return Wizard (devolución de compra, multi-producto) ---
  isReturnWizardOpen = signal(false);

  // --- Warehouses (for transfer and filters) ---
  warehouses: { id: string; name: string }[] = [];

  // --- Filtros adicionales ---
  selectedWarehouse = signal('');
  selectedMovementType = signal('');

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    // Read product query param from URL (e.g. from inventory table history link)
    const productParam = this.route.snapshot.queryParamMap.get('product');
    if (productParam) {
      this.searchTerm.set(productParam);
    }

    this.loadMovements();
    this.loadMovementTypes();
    this.loadWarehouses();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadMovements());
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  loadMovementTypes(): void {
    this.movementsService.getMovementTypes('entry').subscribe({
      next: (types) => this.entryTypes.set(types),
      error: () => {}
    });
    this.movementsService.getMovementTypes('exit').subscribe({
      next: (types) => this.exitTypes.set(types),
      error: () => {}
    });
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data.map(wh => ({ id: wh.id, name: wh.name }));
      },
      error: () => {
        this.warehouses = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadMovements(filters?: MovementFilters, page?: number): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const targetPage = page ?? 1;
    const enhancedFilters: MovementFilters & { warehouse?: string; movement_type?: string } = {
      ...filters,
      fromDate: filters?.fromDate || this.fromDate() || undefined,
      toDate: filters?.toDate || this.toDate() || undefined,
      product: filters?.product || this.searchTerm() || undefined,
      warehouse: this.selectedWarehouse() || undefined,
      movement_type: this.selectedMovementType() || undefined,
    };

    this.offlineFirst.getMovementsPaginated(enhancedFilters, targetPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.movements.set(res.data ?? res);
        this.currentPage.set(res.meta?.currentPage ?? targetPage);
        this.totalItems.set(res.meta?.totalItems ?? (res.data?.length ?? 0));
        this.totalPages.set(res.meta?.totalPages ?? 1);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.notificationService.showError('Error al cargar movimientos');
      }
    });
  }

  applyFilters(): void {
    this.loadMovements({
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      product: this.searchTerm() || undefined,
    }, 1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedWarehouse.set('');
    this.selectedMovementType.set('');
    this.loadMovements(undefined, 1);
  }

  get pagedMovements(): MovementItem[] {
    return this.movements();
  }

  get paginationConfig(): PaginationConfig {
    return {
      currentPage: this.currentPage(),
      totalPages: this.totalPages(),
      totalItems: this.totalItems(),
      itemsPerPage: this.pageSize,
    };
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadMovements(undefined, page);
  }

  // ─── Formatting helpers ─────────────────────────────────────────────────────

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  translateType(type: string): string {
    const map: Record<string, string> = {
      entry: 'Entrada', ENTRY: 'Entrada',
      exit: 'Salida', EXIT: 'Salida',
      return: 'Devolución', RETURN: 'Devolución',
      transfer: 'Transferencia', TRANSFER: 'Transferencia',
    };
    return map[type] ?? type;
  }

  translateCategory(category?: string): string {
    const map: Record<string, string> = {
      insumo: 'Insumo',
      mercancia: 'Mercancía',
      produccion: 'Producción',
    };
    return category ? (map[category] ?? category) : '';
  }

  categoryClass(category?: string): string {
    switch (category) {
      case 'insumo': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'mercancia': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'produccion': return 'bg-teal-50 text-teal-700 border-teal-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  formatCurrency(amount?: number): string {
    if (!amount && amount !== 0) return '-';
    return '$' + amount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  translateComment(comment?: string): string {
    if (!comment) return 'Sin comentario';
    return comment
      .replace('Purchase entry:', 'Entrada de compra:')
      .replace('Direct entry:', 'Entrada directa:')
      .replace('Exit:', 'Salida:')
      .replace('Return:', 'Devolución:');
  }

  typeClass(type: string): string {
    if (type === 'entry' || type === 'ENTRY')
      return 'bg-green-50 text-green-700 border-green-200';
    if (type === 'exit' || type === 'EXIT')
      return 'bg-red-50 text-red-700 border-red-200';
    if (type === 'transfer' || type === 'TRANSFER')
      return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  }

  isEntry(m: MovementItem): boolean {
    return m.type === 'entry' || m.type === 'ENTRY';
  }

  // ─── Exportación ──────────────────────────────────────────────────────────

  private buildExportData(movements: MovementItem[]): ExportData {
    return {
      headers: ['Tipo', 'Código', 'Producto', 'Cantidad', 'Importe', 'Fecha', 'Observación'],
      data: movements.map(m => [
        this.translateType(m.type),
        m.movementCode || '-',
        `${m.product.productName} (${m.product.productCode})`,
        m.quantity.toString(),
        this.formatCurrency(m.totalAmount ?? 0),
        this.formatDate(m.createdAt),
        m.reportNumber || m.reason || '-',
      ]),
      fileName: 'movimientos_inventario'
    };
  }

  get exportData(): ExportData {
    return this.buildExportData(this.movements());
  }

  exportDataFn = async (): Promise<ExportData> => {
    const filters: MovementFilters = {
      product: this.searchTerm() || undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      warehouse: this.selectedWarehouse() || undefined,
      movement_type: (this.selectedMovementType() as any) || undefined,
    };
    const all = await lastValueFrom(this.offlineFirst.getMovements(filters));
    return this.buildExportData(all ?? []);
  };

  onExportComplete(event: { type: 'pdf' | 'excel'; fileName: string }): void {
    this.notificationService.showSuccess(`Exportación ${event.type.toUpperCase()} completada`);
  }

  // ─── Entry Wizard ──────────────────────────────────────────────────────────

  openEntryWizard(): void {
    this.router.navigate(['/inventory/entry/new']);
  }

  closeEntryWizard(): void {
    this.isEntryWizardOpen.set(false);
  }

  onDirectEntrySubmit(entry: DirectEntryDto): void {
    this.offlineFirst.registerDirectEntry(entry).subscribe({
      next: () => {
        this.notificationService.showSuccess('Entrada registrada correctamente');
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar entrada')
    });
  }

  // movements-list.component.ts (fragmento modificado)
onPurchaseSubmit(payload: CreatePurchasePayload & { movementCode: string; category: InventoryCategory }): void {
    console.log('📦 Enviando compra con cuentas:', {
    debit: payload.debitAccountCode,
    credit: payload.creditAccountCode,
    products: payload.products.length
  });
  this.offlineFirst.createPurchase({
    entity: payload.entity,
    warehouse: payload.warehouse,
    supplier: payload.supplier,
    document: payload.document,
    products: payload.products,
    debitAccountCode: payload.debitAccountCode,   // 👈 AÑADIDO
    creditAccountCode: payload.creditAccountCode, // 👈 AÑADIDO
  }).subscribe({
    next: (res: any) => {
      this.notificationService.showSuccess('Compra registrada correctamente');
      if (res?.accountingWarning) {
        this.notificationService.showError(res.accountingWarning);
      }
      this.loadMovements();
      this.refreshStock();
    },
    error: () => this.notificationService.showError('Error al registrar compra')
  });
}
  // ─── Exit Page (multi-product) ─────────────────────────────────────────

  openExitWizard(): void {
    this.router.navigate(['/inventory/exit/new']);
  }

  // ─── Exit Form (single product) ─────────────────────────────────────────────

  openExit(m: MovementItem): void {
    this.selectedForExit = m;
    this.isExitFormOpen.set(true);
  }

  closeExitForm(): void {
    this.isExitFormOpen.set(false);
    this.selectedForExit = null;
  }

  onExitSubmit(exitData: ExitDto): void {
    this.offlineFirst.registerExit(exitData).subscribe({
      next: () => {
        this.notificationService.showSuccess('Salida registrada correctamente');
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar salida')
    });
  }

  // ─── Transfer Wizard (multi-product) ────────────────────────────────────────

  openTransferWizard(): void {
    this.isTransferWizardOpen.set(true);
  }

  closeTransferWizard(): void {
    this.isTransferWizardOpen.set(false);
  }

  onTransferWizardSubmit(transferData: TransferDto): void {
    this.offlineFirst.createTransfer(transferData).subscribe({
      next: () => {
        this.notificationService.showSuccess('Transferencia registrada correctamente');
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar transferencia')
    });
  }

  // ─── Transfer Form (single product) ───────────────────────────────────────────

  openTransfer(m: MovementItem): void {
    this.selectedForTransfer = m;
    this.isTransferFormOpen.set(true);
  }

  closeTransferForm(): void {
    this.isTransferFormOpen.set(false);
    this.selectedForTransfer = null;
  }

  onTransferSubmit(transferData: TransferDto): void {
    this.offlineFirst.createTransfer(transferData).subscribe({
      next: () => {
        this.notificationService.showSuccess('Transferencia registrada correctamente');
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar transferencia')
    });
  }

  // ─── Devolución ───────────────────────────────────────────────────────────

  openReturnWizard(): void {
    this.isReturnWizardOpen.set(true);
  }

  closeReturnWizard(): void {
    this.isReturnWizardOpen.set(false);
  }

  onReturnWizardSubmit(returnData: ReturnDto): void {
    this.offlineFirst.createReturn(returnData).subscribe({
      next: () => {
        this.notificationService.showSuccess('Devolución registrada correctamente');
        this.closeReturnWizard();
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar devolución')
    });
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private refreshStock(): void {
    this.offlineFirst.getInventory().subscribe({
      next: (inv) => this.notificationService.refreshNotifications(inv),
      error: () => {}
    });
  }
}
