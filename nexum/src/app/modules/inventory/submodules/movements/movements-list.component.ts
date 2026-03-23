import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MovementsService } from '../../../../core/services/movements.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { MovementItem, MovementFilters, DirectEntryDto, ExitDto } from '../../../../models/inventory.models';

@Component({
  selector: 'app-movements-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  templateUrl: './movements-list.component.html',
})
export class MovementsListComponent implements OnInit, OnDestroy {
  private movementsService = inject(MovementsService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);

  movements = signal<MovementItem[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  currentPage = signal(1);
  pageSize = 5;

  searchTerm = signal('');
  fromDate = signal('');
  toDate = signal('');

  // --- Modal: Entrada directa ---
  isDirectEntryOpen = signal(false);
  directEntry: DirectEntryDto = { productCode: '', productName: '', productDescription: '', quantity: 1, label: '' };

  // --- Modal: Confirmar devolución ---
  isConfirmReturnOpen = signal(false);
  selectedForReturn: MovementItem | null = null;

  // --- Modal: Motivo devolución ---
  isReturnOpen = signal(false);
  returnComment = '';

  // --- Modal: Salida ---
  isExitOpen = signal(false);
  selectedForExit: MovementItem | null = null;
  exitData: ExitDto & { unitPrice: number; unit: string } = {
    productCode: '', quantity: 1, reason: '', entity: '', warehouse: '', unit: '', unitPrice: 0
  };

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadMovements();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadMovements());
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadMovements(filters?: MovementFilters): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.movementsService.getMovements(filters).subscribe({
      next: (data) => {
        this.movements.set(data);
        this.currentPage.set(1);
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
    const filters: MovementFilters = {
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      product: this.searchTerm() || undefined,
    };
    this.loadMovements(filters);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.loadMovements();
  }

  get filteredMovements(): MovementItem[] {
    const search = this.searchTerm().toLowerCase();
    if (!search) return this.movements();
    return this.movements().filter(m =>
      m.product.productName.toLowerCase().includes(search) ||
      m.product.productCode.toLowerCase().includes(search)
    );
  }

  get pagedMovements(): MovementItem[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredMovements.slice(start, start + this.pageSize);
  }

  get paginationConfig(): PaginationConfig {
    const total = this.filteredMovements.length;
    return {
      currentPage: this.currentPage(),
      totalPages: Math.ceil(total / this.pageSize),
      totalItems: total,
      itemsPerPage: this.pageSize,
    };
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

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
    };
    return map[type] ?? type;
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
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  }

  isEntry(m: MovementItem): boolean {
    return m.type === 'entry' || m.type === 'ENTRY';
  }

  // ─── Entrada directa ──────────────────────────────────────────────────────
  openDirectEntry(): void {
    this.directEntry = { productCode: '', productName: '', productDescription: '', quantity: 1, label: '' };
    this.isDirectEntryOpen.set(true);
  }

  closeDirectEntry(): void { this.isDirectEntryOpen.set(false); }

  confirmDirectEntry(): void {
    if (!this.directEntry.productCode?.trim()) {
      this.notificationService.showError('El código del producto es obligatorio');
      return;
    }
    if (!this.directEntry.productName?.trim()) {
      this.notificationService.showError('El nombre del producto es obligatorio');
      return;
    }
    if (!this.directEntry.quantity || this.directEntry.quantity <= 0) {
      this.notificationService.showError('La cantidad debe ser mayor a 0');
      return;
    }
    this.movementsService.registerDirectEntry(this.directEntry).subscribe({
      next: () => {
        this.notificationService.showSuccess('Entrada registrada correctamente');
        this.closeDirectEntry();
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar entrada')
    });
  }

  // ─── Devolución ───────────────────────────────────────────────────────────
  openReturnConfirm(m: MovementItem): void {
    if (!m.purchaseId) {
      this.notificationService.showError('Este movimiento no tiene compra asociada');
      return;
    }
    this.selectedForReturn = m;
    this.isConfirmReturnOpen.set(true);
  }

  closeConfirmReturn(): void {
    this.isConfirmReturnOpen.set(false);
    this.selectedForReturn = null;
  }

  continueToReturnComment(): void {
    this.isConfirmReturnOpen.set(false);
    this.returnComment = '';
    this.isReturnOpen.set(true);
  }

  closeReturn(): void {
    this.isReturnOpen.set(false);
    this.returnComment = '';
    this.selectedForReturn = null;
  }

  confirmReturn(): void {
    if (!this.returnComment?.trim()) {
      this.notificationService.showError('El motivo de devolución es obligatorio');
      return;
    }
    this.movementsService.createReturn(this.selectedForReturn!.purchaseId!, this.returnComment).subscribe({
      next: () => {
        this.notificationService.showSuccess('Devolución registrada correctamente');
        this.closeReturn();
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar devolución')
    });
  }

  // ─── Salida ───────────────────────────────────────────────────────────────
  openExit(m: MovementItem): void {
    this.selectedForExit = m;
    this.exitData = {
      productCode: m.product.productCode,
      quantity: 1,
      reason: '',
      entity: m.product.entity ?? '',
      warehouse: m.product.warehouse ?? '',
      unit: m.product.productUnit ?? '',
      unitPrice: m.product.unitPrice ?? 0,
    };
    this.isExitOpen.set(true);
  }

  closeExit(): void {
    this.isExitOpen.set(false);
    this.selectedForExit = null;
  }

  confirmExit(): void {
    if (!this.exitData.quantity || this.exitData.quantity <= 0) {
      this.notificationService.showError('La cantidad debe ser mayor a 0');
      return;
    }
    const payload: ExitDto = {
      productCode: this.exitData.productCode,
      quantity: this.exitData.quantity,
      reason: this.exitData.reason,
      entity: this.exitData.entity,
      warehouse: this.exitData.warehouse,
    };
    this.movementsService.registerExit(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Salida registrada correctamente');
        this.closeExit();
        this.loadMovements();
        this.refreshStock();
      },
      error: () => this.notificationService.showError('Error al registrar salida')
    });
  }

  private refreshStock(): void {
    this.inventoryService.getInventory().subscribe({
      next: (inv) => this.notificationService.refreshNotifications(inv),
      error: () => {}
    });
  }
}
