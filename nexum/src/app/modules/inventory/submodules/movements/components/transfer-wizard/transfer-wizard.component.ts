import { Component, signal, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { TransferDto, MovementTypeOption, InventoryCategory, InventoryItem } from '../../../../../../models/inventory.models';
import { MovementsService } from '../../../../../../core/services/movements.service';
import { WarehouseService } from '../../../../../../core/services/warehouse.service';
import { InventoryService } from '../../../../../../core/services/inventory.service';

const TRANSFER_EXIT_CODES: Record<string, string> = {
  insumo: '1102',
  mercancia: '2102',
  produccion: '3102',
};

@Component({
  selector: 'app-transfer-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './transfer-wizard.component.html',
})
export class TransferWizardComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() warehouses: { id: string; name: string }[] = [];
  
  @Output() closeEvent = new EventEmitter<void>();
  @Output() submitTransfer = new EventEmitter<TransferDto>();

  private fb = inject(FormBuilder);
  private movementsService = inject(MovementsService);
  private warehouseService = inject(WarehouseService);
  private inventoryService = inject(InventoryService);

  isLoading = signal(false);
  stockSearch = '';
  isLoadingStock = signal(false);
  filteredStock = signal<any[]>([]);
  totalItems = 0;
  totalAmount = 0;
  transferTypes = signal<MovementTypeOption[]>([]);
  selectedCategory = '';
  reason = '';
  movementCode = '';
  sourceWarehouseId = '';
  destinationWarehouseId = '';
  categoryOptions = [
    { value: 'insumo', label: 'Insumo', code: '100' },
    { value: 'mercancia', label: 'Mercancía', code: '200' },
    { value: 'produccion', label: 'Producción', code: '300' }
  ];

  // Form groups
  headerForm: FormGroup;
  itemsForm: FormGroup;

  // Dynamic items list
  items = signal<any[]>([]);

  constructor() {
    this.headerForm = this.fb.group({
      movementCode: ['', Validators.required],
      sourceWarehouseId: ['', Validators.required],
      destinationWarehouseId: ['', Validators.required],
      reason: ['', Validators.required],
    });

    this.itemsForm = this.fb.group({
      productCode: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, Validators.required],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      console.log('📦 TRANSFER WIZARD - Modal abierto, inicializando datos...');
      this.loadWarehouses();
      this.loadTransferTypes();
      this.resetForm();
    }
  }

  
  closeWizard(): void {
    this.isOpen = false;
    this.closeEvent.emit();
  }

  formatCurrency(amount?: number): string {
    if (!amount && amount !== 0) return '-';
    return '$' + amount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  updateQuantity(index: number, quantity: number): void {
    const currentItems = this.items();
    const item = currentItems[index];
    item.quantity = quantity < 1 ? 1 : quantity;
    item.totalAmount = item.quantity * item.unitPrice;
    this.items.set([...currentItems]);
    this.updateTotals();
  }

  removeProduct(index: number): void {
    this.items.set(this.items().filter((_, i) => i !== index));
    this.updateTotals();
  }

  filterStock(): void {
    if (!this.sourceWarehouseId) {
      this.filteredStock.set([]);
      return;
    }

    this.isLoadingStock.set(true);
    this.inventoryService.getInventory({
      warehouse: this.sourceWarehouseId,
      product: this.stockSearch || undefined,
      isActive: true
    }).subscribe({
      next: (data: InventoryItem[]) => {
        const available = (data || []).filter((item: InventoryItem) => item.stock && item.stock > 0);
        this.filteredStock.set(available);
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
    const newItem = {
      productCode: product.productCode,
      productName: product.productName,
      quantity: 1,
      unitPrice: product.unitPrice || 0,
      totalAmount: product.unitPrice || 0,
      stock: product.stock || 0,
      unit: product.productUnit || 'und'
    };
    this.items.set([...this.items(), newItem]);
    this.updateTotals();
  }

  private updateTotals(): void {
    this.totalItems = this.items().length;
    this.totalAmount = this.items().reduce((sum, item) => sum + item.totalAmount, 0);
  }

  get transferItems() {
    return this.items;
  }

  get destinationWarehouses() {
    return this.availableDestinationWarehouses;
  }

  onClose(): void {
    this.closeWizard();
  }

  onConfirm(): void {
    this.onSubmit();
  }

  onCategoryChange(): void {
    // El código de transferencia enviada es fijo por categoría (1102/2102/3102)
    const expected = TRANSFER_EXIT_CODES[this.selectedCategory] || '';
    const type = this.transferTypes().find(t => t.code === expected);
    this.movementCode = type?.code || expected;
  }

  onSourceWarehouseChange(): void {
    // Al cambiar el origen, limpiar destino y productos, y recargar stock
    this.destinationWarehouseId = '';
    this.items.set([]);
    this.updateTotals();
    this.filterStock();
  }

  private loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data: any) => {
        this.warehouses = data.map((wh: any) => ({ id: wh.id, name: wh.name }));
      },
      error: (err) => {
        console.error('❌ Error cargando almacenes:', err);
        this.warehouses = [];
      }
    });
  }

  private loadTransferTypes(): void {
    this.movementsService.getMovementTypes('exit').subscribe({
      next: (types: MovementTypeOption[]) => {
        const codes = Object.values(TRANSFER_EXIT_CODES);
        this.transferTypes.set((types || []).filter(t => codes.includes(t.code)));
      },
      error: (err) => {
        console.error('❌ Error cargando tipos de transferencia:', err);
        this.transferTypes.set([]);
      }
    });
  }

  private resetForm(): void {
    this.itemsForm.reset({ productCode: '', quantity: 1, unitPrice: 0 });
    this.items.set([]);
    this.filteredStock.set([]);
    this.selectedCategory = '';
    this.movementCode = '';
    this.sourceWarehouseId = '';
    this.destinationWarehouseId = '';
    this.reason = '';
    this.stockSearch = '';
    this.totalItems = 0;
    this.totalAmount = 0;
    this.isLoadingStock.set(false);
  }

  get availableDestinationWarehouses(): { id: string; name: string }[] {
    return this.warehouses.filter(wh => wh.id !== this.sourceWarehouseId);
  }

  addItem(): void {
    const itemData = this.itemsForm.value;
    
    // Validate product exists and has sufficient stock
    if (!itemData.productCode || itemData.quantity <= 0) {
      return;
    }

    const newItem = {
      ...itemData,
      productName: `Producto ${itemData.productCode}`, // Would be fetched from service
      totalAmount: itemData.quantity * itemData.unitPrice
    };

    this.items.set([...this.items(), newItem]);
    this.itemsForm.reset({
      productCode: '',
      quantity: 1,
      unitPrice: 0
    });
  }

  removeItem(index: number): void {
    this.items.set(this.items().filter((_, i) => i !== index));
  }

  getTotalAmount(): number {
    return this.items().reduce((sum, item) => sum + item.totalAmount, 0);
  }

  onSubmit(): void {
    if (!this.movementCode || !this.sourceWarehouseId || !this.destinationWarehouseId || this.items().length === 0) {
      return;
    }

    if (this.sourceWarehouseId === this.destinationWarehouseId) {
      return;
    }

    const transferData: TransferDto = {
      movementCode: this.movementCode,
      sourceWarehouseId: this.sourceWarehouseId,
      destinationWarehouseId: this.destinationWarehouseId,
      reason: this.reason,
      items: this.items().map(item => ({
        productCode: item.productCode,
        quantity: item.quantity
      }))
    };

    this.submitTransfer.emit(transferData);
    this.closeWizard();
  }
}
