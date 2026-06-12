import { Component, signal, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ExitDto, MovementTypeOption, InventoryCategory } from '../../../../../../models/inventory.models';
import { MovementsService } from '../../../../../../core/services/movements.service';
import { WarehouseService } from '../../../../../../core/services/warehouse.service';

@Component({
  selector: 'app-exit-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './exit-wizard.component.html',
})
export class ExitWizardComponent {
  @Input() isOpen = false;
  @Input() exitTypes: MovementTypeOption[] = [];
  @Input() warehouses: { id: string; name: string }[] = [];
  
  @Output() close = new EventEmitter<void>();
  @Output() submitExit = new EventEmitter<ExitDto>();

  private fb = inject(FormBuilder);
  private movementsService = inject(MovementsService);
  private warehouseService = inject(WarehouseService);

  isLoading = signal(false);
  stockSearch = '';
  isLoadingStock = signal(false);
  filteredStock = signal<any[]>([]);
  totalItems = 0;
  totalAmount = 0;
  selectedCategory = '';
  reason = '';
  categoryOptions = [
    { value: 'insumo', label: 'Insumo', code: '100' },
    { value: 'mercancia', label: 'Mercancía', code: '200' },
    { value: 'produccion', label: 'Producción', code: '300' }
  ];
  warehouseId = '';
  isCostCenterExit = false;
  expenseElements: { code: string; label: string }[] = [];
  entity = '';
  currentStep = 'select-type';

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

  open(): void {
    this.isOpen = true;
    this.loadWarehouses();
    this.loadExitTypes();
    this.resetForm();
  }

  closeWizard(): void {
    this.isOpen = false;
    this.close.emit();
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

  onClose(): void {
    this.closeWizard();
  }

  onConfirm(): void {
    this.onSubmit();
  }

  onCategoryChange(): void {
    // Handle category change if needed
  }

  get exitItems() {
    return this.items;
  }

  updateExpenseElement(index: number, value: any): void {
    // Handle expense element update
  }

  goBack(): void {
    this.closeWizard();
  }

  get selectedType() {
    return this.headerForm.get('movementCode')?.value;
  }

  onWarehouseChange(): void {
    // Handle warehouse change
  }

  get step() {
    return this.currentStep;
  }

  selectType(type: any): void {
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
      next: (types: any) => this.exitTypes = types,
      error: () => {}
    });
  }

  private resetForm(): void {
    this.headerForm.reset();
    this.itemsForm.reset();
    this.items.set([]);
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

    const headerData = this.headerForm.value;
    const exitData: ExitDto = {
      movementCode: headerData.movementCode,
      warehouseId: headerData.warehouseId,
      reason: headerData.reason,
      items: this.items().map(item => ({
        productCode: item.productCode,
        quantity: item.quantity
      }))
    };

    this.submitExit.emit(exitData);
    this.closeWizard();
  }
}
