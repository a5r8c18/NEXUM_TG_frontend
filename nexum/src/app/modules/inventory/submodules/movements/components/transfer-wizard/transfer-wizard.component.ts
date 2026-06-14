import { Component, signal, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { TransferDto, MovementTypeOption, InventoryCategory } from '../../../../../../models/inventory.models';
import { MovementsService } from '../../../../../../core/services/movements.service';
import { WarehouseService } from '../../../../../../core/services/warehouse.service';

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

  isLoading = signal(false);
  stockSearch = '';
  isLoadingStock = signal(false);
  filteredStock = signal<any[]>([]);
  totalItems = 0;
  totalAmount = 0;
  transferTypes = signal<MovementTypeOption[]>([]);
  selectedCategory = '';
  reason = '';
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
    currentItems[index].quantity = quantity;
    currentItems[index].totalAmount = quantity * currentItems[index].unitPrice;
    this.items.set([...currentItems]);
  }

  removeProduct(index: number): void {
    this.items.set(this.items().filter((_, i) => i !== index));
    this.updateTotals();
  }

  filterStock(): void {
    // This would filter available stock items
    // For now, return empty array as placeholder
    this.filteredStock.set([]);
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
      totalAmount: product.unitPrice || 0
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

  get sourceWarehouseId() {
    return this.headerForm.get('sourceWarehouseId')?.value;
  }

  get destinationWarehouseId() {
    return this.headerForm.get('destinationWarehouseId')?.value;
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
    // Handle category change if needed
  }

  onSourceWarehouseChange(): void {
    // Handle source warehouse change if needed
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

  private loadTransferTypes(): void {
    this.movementsService.getMovementTypes('transfer').subscribe({
      next: (types: any) => this.transferTypes.set(types),
      error: () => {}
    });
  }

  private resetForm(): void {
    this.headerForm.reset();
    this.itemsForm.reset();
    this.items.set([]);
  }

  get availableDestinationWarehouses(): { id: string; name: string }[] {
    const sourceId = this.headerForm.get('sourceWarehouseId')?.value;
    return this.warehouses.filter(wh => wh.id !== sourceId);
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
    if (this.headerForm.invalid || this.items().length === 0) {
      this.headerForm.markAllAsTouched();
      return;
    }

    const sourceWarehouseId = this.headerForm.get('sourceWarehouseId')?.value;
    const destinationWarehouseId = this.headerForm.get('destinationWarehouseId')?.value;

    if (sourceWarehouseId === destinationWarehouseId) {
      return;
    }

    const headerData = this.headerForm.value;
    const transferData: TransferDto = {
      movementCode: headerData.movementCode,
      sourceWarehouseId: headerData.sourceWarehouseId,
      destinationWarehouseId: headerData.destinationWarehouseId,
      reason: headerData.reason,
      items: this.items().map(item => ({
        productCode: item.productCode,
        quantity: item.quantity
      }))
    };

    this.submitTransfer.emit(transferData);
    this.closeWizard();
  }
}
