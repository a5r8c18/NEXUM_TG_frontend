import { Component, signal, inject, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { AccountSelectorComponent } from '../../../../../../shared/components/account-selector/account-selector.component';
import { ExitDto, MovementTypeOption, InventoryCategory, InventoryResponse, InventoryItem } from '../../../../../../models/inventory.models';
import { MovementsService } from '../../../../../../core/services/movements.service';
import { WarehouseService } from '../../../../../../core/services/warehouse.service';
import { InventoryService } from '../../../../../../core/services/inventory.service';
import { Account } from '../../../../../../core/services/accounting.service';

@Component({
  selector: 'app-exit-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, AccountSelectorComponent],
  templateUrl: './exit-wizard.component.html',
})
export class ExitWizardComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() exitTypes: MovementTypeOption[] = [];
  @Input() warehouses: { id: string; name: string }[] = [];
  
  @Output() closeEvent = new EventEmitter<void>();
  @Output() submitExit = new EventEmitter<ExitDto>();

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
  selectedCategory = '';
  reason = '';
  
  // --- Accounting account selection ---
  selectedDebitAccount = signal<Account | null>(null);
  selectedCreditAccount = signal<Account | null>(null);
  
  categoryOptions = [
    { value: 'insumo', label: 'Insumo', code: '100' },
    { value: 'mercancia', label: 'Mercancía', code: '200' },
    { value: 'produccion', label: 'Producción', code: '300' }
  ];
  warehouseId = '';
  selectedTypeData: MovementTypeOption | null = null;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      console.log('📤 EXIT WIZARD - Modal abierto, inicializando datos...');
      this.loadWarehouses();
      this.loadExitTypes();
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
    console.log('📤 EXIT WIZARD - Filtrando stock por almacén:', {
      warehouseId: this.warehouseId,
      searchTerm: this.stockSearch,
      currentStock: this.filteredStock().length
    });

    if (!this.warehouseId) {
      console.log('❌ EXIT WIZARD - No hay almacén seleccionado');
      this.filteredStock.set([]);
      return;
    }

    this.isLoadingStock.set(true);
    
    // Obtener inventario del almacén seleccionado
    this.inventoryService.getInventory({
      warehouse: this.warehouseId,
      search: this.stockSearch || undefined,
      isActive: true
    }).subscribe({
      next: (data: InventoryItem[]) => {
        console.log('✅ EXIT WIZARD - Respuesta del backend recibida:', {
          warehouseId: this.warehouseId,
          responseType: typeof data,
          isArray: Array.isArray(data),
          total: data?.length || 0,
          data: data
        });
        
        // El servicio ya extrae el array del response
        const stockItems: InventoryItem[] = data || [];
        console.log('📤 EXIT WIZARD - Items extraídos:', {
          isArray: Array.isArray(stockItems),
          total: stockItems.length,
          items: stockItems
        });
        
        // Filtrar solo productos con stock disponible (> 0)
        const availableStock = stockItems.filter((item: InventoryItem) => 
          item.stock && item.stock > 0
        );
        
        console.log('📤 EXIT WIZARD - Stock disponible:', {
          totalItems: stockItems.length,
          availableItems: availableStock.length,
          items: availableStock
        });
        
        this.filteredStock.set(availableStock);
        this.isLoadingStock.set(false);
      },
      error: (error) => {
        console.log('❌ EXIT WIZARD - Error cargando inventario:', error);
        this.filteredStock.set([]);
        this.isLoadingStock.set(false);
      }
    });
  }

  isAlreadyAdded(productCode: string): boolean {
    return this.items().some(item => item.productCode === productCode);
  }

  addProduct(product: any): void {
    console.log('📤 EXIT WIZARD - Intentando agregar producto:', {
      product: product,
      currentItems: this.items().length,
      isAlreadyAdded: this.isAlreadyAdded(product.productCode)
    });
    
    if (this.isAlreadyAdded(product.productCode)) {
      console.log('❌ EXIT WIZARD - Producto ya agregado:', product.productCode);
      return;
    }
    const newItem = {
      productCode: product.productCode,
      productName: product.productName,
      quantity: 1,
      unitPrice: product.unitPrice || 0,
      totalAmount: product.unitPrice || 0,
      stock: product.quantity || product.stock || 0,
      unit: product.productUnit || product.unit || 'UN'
    };
    console.log('📤 EXIT WIZARD - Nuevo item creado:', newItem);
    this.items.set([...this.items(), newItem]);
    this.updateTotals();
    console.log('✅ EXIT WIZARD - Producto agregado exitosamente. Total items:', this.items().length);
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

  get selectedType(): MovementTypeOption | null {
    return this.selectedTypeData;
  }

  onWarehouseChange(event?: Event): void {
    // Leer el valor directamente del select (determinista e inmediato)
    const selectedId = event
      ? (event.target as HTMLSelectElement).value
      : (this.headerForm.get('warehouseId')?.value || '');

    this.warehouseId = selectedId;
    // Mantener el control reactivo sincronizado (validación / onSubmit)
    this.headerForm.get('warehouseId')?.setValue(selectedId, { emitEvent: false });

    // Limpiar productos seleccionados
    this.items.set([]);
    this.filteredStock.set([]);

    // Cargar stock del nuevo almacén
    if (this.warehouseId) {
      this.filterStock();
    }
  }

  get step() {
    return this.currentStep;
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
      next: (types: any) => this.exitTypes = types,
      error: () => {}
    });
  }

  private resetForm(): void {
    this.headerForm.reset({ movementCode: '', warehouseId: '', reason: '' });
    this.itemsForm.reset({ productCode: '', quantity: 1, unitPrice: 0 });
    this.items.set([]);
    this.filteredStock.set([]);
    this.currentStep = 'select-type';
    this.selectedTypeData = null;
    this.warehouseId = '';
    this.stockSearch = '';
    this.entity = '';
    this.reason = '';
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

  // --- Métodos para selección de cuentas contables ---
  onDebitAccountSelected(account: Account | null): void {
    this.selectedDebitAccount.set(account);
  }

  onCreditAccountSelected(account: Account | null): void {
    this.selectedCreditAccount.set(account);
  }

  // Determinar tipos de cuenta sugeridos según el movimiento
  getDebitAccountType(): 'asset' | 'liability' | 'equity' | 'income' | 'expense' | undefined {
    const code = this.headerForm.get('movementCode')?.value;
    if (!code) return undefined;
    
    // Salidas: generalmente débito a cuentas de gastos o costo de ventas
    if (['105', '205', '305'].includes(code)) return 'expense'; // Sobrantes
    if (['1104', '2104', '3104'].includes(code)) return 'expense'; // Faltantes
    return undefined;
  }

  getCreditAccountType(): 'asset' | 'liability' | 'equity' | 'income' | 'expense' | undefined {
    const code = this.headerForm.get('movementCode')?.value;
    if (!code) return undefined;
    
    // Salidas: crédito a cuentas de inventario (activo)
    return 'asset';
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
        quantity: item.quantity
      }))
    };

    this.submitExit.emit(exitData);
    this.closeWizard();
  }
}
