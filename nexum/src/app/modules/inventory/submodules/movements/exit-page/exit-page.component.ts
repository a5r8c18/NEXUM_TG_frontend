import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ExitDto, ExitItemDto, MovementTypeOption, InventoryItem } from '../../../../../models/inventory.models';
import { MovementsService } from '../../../../../core/services/movements.service';
import { WarehouseService } from '../../../../../core/services/warehouse.service';
import { InventoryService } from '../../../../../core/services/inventory.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { OfflineFirstService } from '../../../../../core/offline/offline-first.service';
import { Account } from '../../../../../core/services/accounting.service';
import { AccountSelectorComponent } from '../../../../../shared/components/account-selector/account-selector.component';

@Component({
  selector: 'app-exit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AccountSelectorComponent],
  templateUrl: './exit-page.component.html',
})
export class ExitPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private movementsService = inject(MovementsService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);
  private notificationService = inject(NotificationService);
  private offlineFirst = inject(OfflineFirstService);

  isLoading = signal(false);
  stockSearch = '';
  isLoadingStock = signal(false);
  filteredStock = signal<any[]>([]);
  totalItems = 0;
  totalAmount = 0;
  selectedCategory = '';
  reason = '';
  entity = '';
  
  // Accounting account selection
  selectedDebitAccount = signal<Account | null>(null);
  selectedCreditAccount = signal<Account | null>(null);
  
  warehouseId = '';
  selectedTypeData: MovementTypeOption | null = null;
  isCostCenterExit = false;
  expenseElements: { code: string; label: string }[] = [];
  currentStep = 'select-type';
  exitTypes = signal<MovementTypeOption[]>([]);
  warehouses: { id: string; name: string }[] = [];

  // Form groups
  headerForm: FormGroup;
  itemsForm: FormGroup;

  // Dynamic items list
  items = signal<any[]>([]);

  constructor() {
    this.headerForm = this.fb.group({
      movementCode: ['', Validators.required],
      warehouseId: ['', Validators.required],
      reason: ['', Validators.required],
    });

    this.itemsForm = this.fb.group({
      productCode: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadExitTypes();
  }

  goBack(): void {
    this.router.navigate(['/inventory/movements']);
  }

  formatCurrency(amount?: number): string {
    if (!amount && amount !== 0) return '-';
    return '$' + amount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  removeProduct(index: number): void {
    this.items.set(this.items().filter((_, i) => i !== index));
    this.updateTotals();
  }

  filterStock(): void {
    if (!this.warehouseId) {
      this.filteredStock.set([]);
      return;
    }

    this.isLoadingStock.set(true);
    
    this.inventoryService.getInventory({
      warehouse: this.warehouseId,
      search: this.stockSearch || undefined,
      isActive: true
    }).subscribe({
      next: (data: InventoryItem[]) => {
        const stockItems: InventoryItem[] = data || [];
        const availableStock = stockItems.filter((item: InventoryItem) => 
          item.stock && item.stock > 0
        );
        this.filteredStock.set(availableStock);
        this.isLoadingStock.set(false);
      },
      error: () => {
        this.filteredStock.set([]);
        this.isLoadingStock.set(false);
      }
    });
  }

  isAlreadyAdded(productCode: string): boolean {
    return this.items().some(item => item.productCode === productCode);
  }

  addProduct(product: any): void {
    if (this.isAlreadyAdded(product.productCode)) {
      return;
    }
    const unitPrice = product.unitPrice || 0;
    const newItem = {
      productCode: product.productCode,
      productName: product.productName,
      quantity: 1,
      unitPrice,
      totalAmount: unitPrice,
      stock: product.quantity || product.stock || 0,
      unit: product.productUnit || product.unit || 'UN'
    };
    this.items.set([...this.items(), newItem]);
    this.updateTotals();
  }

  updateQuantity(index: number, quantity: number | string): void {
    const currentItems = this.items();
    const item = currentItems[index];
    const qty = Math.max(1, Number(quantity) || 1);
    item.quantity = qty;
    item.totalAmount = item.quantity * item.unitPrice;
    this.items.set([...currentItems]);
    this.updateTotals();
  }

  private updateTotals(): void {
    this.totalItems = this.items().length;
    this.totalAmount = this.items().reduce((sum, item) => sum + item.totalAmount, 0);
  }

  onWarehouseChange(event?: Event): void {
    const selectedId = event
      ? (event.target as HTMLSelectElement).value
      : (this.headerForm.get('warehouseId')?.value || '');

    this.warehouseId = selectedId;
    this.headerForm.get('warehouseId')?.setValue(selectedId, { emitEvent: false });

    this.items.set([]);
    this.filteredStock.set([]);

    if (this.warehouseId) {
      this.filterStock();
    }
  }

  selectType(type: any): void {
    this.selectedTypeData = type;
    this.headerForm.get('movementCode')?.setValue(type.code);
    this.currentStep = 'select-products';
  }

  categoryClass(category?: string): string {
    switch (category) {
      case 'insumo': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'mercancia': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'produccion': return 'bg-teal-50 text-teal-700 border-teal-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  categoryLabel(category?: string): string {
    const map: Record<string, string> = {
      insumo: 'Insumo',
      mercancia: 'Mercancía',
      produccion: 'Producción',
    };
    return category ? (map[category] ?? category) : '';
  }

  private loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data: any) => {
        this.warehouses = data.map((wh: any) => ({ id: wh.id, name: wh.name }));
      },
      error: () => {
        this.warehouses = [];
      }
    });
  }

  private loadExitTypes(): void {
    this.movementsService.getMovementTypes('exit').subscribe({
      next: (types: any) => {
        console.log('✅ Tipos de salida cargados:', types);
        this.exitTypes.set(types || []);
      },
      error: (err) => {
        console.error('❌ Error cargando tipos de salida:', err);
        this.notificationService.showError('No se pudieron cargar los tipos de salida');
        this.exitTypes.set([]);
      }
    });
  }

  // Accounting account selection
  onDebitAccountSelected(account: Account | null): void {
    this.selectedDebitAccount.set(account);
  }

  onCreditAccountSelected(account: Account | null): void {
    this.selectedCreditAccount.set(account);
  }

  getDebitAccountType(): 'asset' | 'liability' | 'equity' | 'income' | 'expense' | undefined {
    const code = this.headerForm.get('movementCode')?.value;
    if (!code) return undefined;

    // Gastos / costos: ventas, salida a centro de costo, producción terminada
    if (['1101', '2100', '2101', '2108', '2109', '3100', '3101',
         '1105', '2105', '3105', '3109'].includes(code)) {
      return 'expense';
    }
    // Pasivo: devolución de compra a entidades (se disminuye deuda)
    if (['1107', '2107'].includes(code)) {
      return 'liability';
    }
    // Activo: transferencias, faltantes, salida para custodio
    return 'asset';
  }

  getCreditAccountType(): 'asset' | 'liability' | 'equity' | 'income' | 'expense' | undefined {
    // En salidas el crédito disminuye el inventario (activo, naturaleza deudora).
    return 'asset';
  }

  updateExpenseElement(index: number, value: any): void {
    // Handle expense element update
  }

  onSubmit(): void {
    const movementCode = this.headerForm.get('movementCode')?.value;
    if (!movementCode || !this.warehouseId || this.items().length === 0) {
      this.headerForm.markAllAsTouched();
      return;
    }

    const exitData: ExitDto = {
      movementCode: movementCode,
      warehouseId: this.warehouseId,
      reason: this.reason,
      debitAccountCode: this.selectedDebitAccount()?.code,
      creditAccountCode: this.selectedCreditAccount()?.code,
      items: this.items().map(item => ({
        productCode: item.productCode,
        quantity: Number(item.quantity) || 1
      }))
    };

    this.isLoading.set(true);
    this.offlineFirst.registerExit(exitData).subscribe({
      next: () => {
        this.notificationService.showSuccess('Salida registrada correctamente');
        this.isLoading.set(false);
        this.router.navigate(['/inventory/movements']);
      },
      error: () => {
        this.notificationService.showError('Error al registrar salida');
        this.isLoading.set(false);
      }
    });
  }
}
