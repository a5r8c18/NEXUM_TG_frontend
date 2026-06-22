import { Component, signal, inject, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { AccountSelectorComponent } from '../../../../../../shared/components/account-selector/account-selector.component';
import { MovementTypeOption, InventoryCategory, DirectEntryDto } from '../../../../../../models/inventory.models';
import { CreatePurchasePayload } from '../../../../../../models/purchase.models';
import { ProductsService } from '../../../../../../core/services/products.service';
import { Account } from '../../../../../../core/services/accounting.service';

export type EntryStep = 'select-type' | 'simple-form' | 'purchase-form';

// Purchase movement codes
const PURCHASE_CODES = ['102', '202', '402'];

// Códigos de centro de costo que requieren elemento de gasto
const COST_CENTER_ENTRY_CODES = ['108', '208', '308'];

// Elementos de gasto comunes en contabilidad cubana
const EXPENSE_ELEMENTS = [
  { code: '01', label: 'Materias primas y materiales' },
  { code: '02', label: 'Combustibles' },
  { code: '03', label: 'Energía' },
  { code: '04', label: 'Salarios' },
  { code: '05', label: 'Depreciación y amortización' },
  { code: '06', label: 'Servicios recibidos' },
  { code: '07', label: 'Transferencias y subsidios' },
  { code: '08', label: 'Otros gastos monetarios' },
];

@Component({
  selector: 'app-entry-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, AccountSelectorComponent],
  templateUrl: './entry-wizard.component.html',
})
export class EntryWizardComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private productsService = inject(ProductsService);

  @Input() isOpen = false;
  @Input() entryTypes: MovementTypeOption[] = [];
  @Input() warehouses: { id: string; name: string }[] = [];
  @Output() closeEvent = new EventEmitter<void>();
  @Output() submitDirectEntry = new EventEmitter<DirectEntryDto>();
  @Output() submitPurchase = new EventEmitter<CreatePurchasePayload & { movementCode: string; category: InventoryCategory }>();

  step = signal<EntryStep>('select-type');
  selectedType = signal<MovementTypeOption | null>(null);

  // --- Product autocomplete (simple form) ---
  allProducts: any[] = [];
  filteredProducts: any[] = [];
  showProductDropdown = false;
  productSearchTerm = '';

  // --- Product autocomplete (purchase form) ---
  purchaseFilteredProducts: any[] = [];
  purchaseDropdownRow: number = -1;
  purchaseDropdownField: 'code' | 'description' | null = null;

  // --- Warehouse autocomplete ---
  warehouseSearchTerm = '';
  filteredWarehouses: { id: string; name: string }[] = [];
  showWarehouseDropdown = false;

  // --- Accounting account selection ---
  selectedDebitAccount = signal<Account | null>(null);
  selectedCreditAccount = signal<Account | null>(null);

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.loadProducts();
    }
  }

  private loadProducts(): void {
    console.log('📦 ENTRY WIZARD - Cargando productos...');
    this.productsService.getAll({ isActive: true }).subscribe({
      next: (data) => {
        console.log('✅ ENTRY WIZARD - Productos cargados:', {
          total: data?.items?.length || data?.length || 0,
          data: data
        });
        this.allProducts = data.items || data;
        console.log('📦 ENTRY WIZARD - allProducts actualizado:', this.allProducts.length);
      },
      error: (error) => {
        console.log('❌ ENTRY WIZARD - Error cargando productos:', error);
        this.allProducts = [];
      }
    });
  }

  onProductSearch(term: string): void {
    this.productSearchTerm = term;
    if (!term || term.length < 1) {
      this.filteredProducts = [];
      this.showProductDropdown = false;
      return;
    }
    const lower = term.toLowerCase();
    this.filteredProducts = this.allProducts.filter(p =>
      p.productName.toLowerCase().includes(lower) ||
      p.productCode.toLowerCase().includes(lower)
    ).slice(0, 10);
    this.showProductDropdown = this.filteredProducts.length > 0;
  }

  selectProduct(product: any): void {
    this.directEntry.productCode = product.productCode;
    this.directEntry.productName = product.productName;
    this.directEntry.productDescription = product.productDescription || '';
    this.directEntry.unit = product.productUnit || '';
    this.directEntry.unitPrice = product.unitPrice || product.defaultUnitPrice || 0;
    this.productSearchTerm = product.productName;
    this.showProductDropdown = false;
  }

  hideProductDropdown(): void {
    setTimeout(() => { this.showProductDropdown = false; }, 200);
  }

  // --- Simple entry form ---
  directEntry: DirectEntryDto = {
    productCode: '',
    productName: '',
    productDescription: '',
    quantity: 1,
    label: '',
    warehouseId: '',
    entity: '',
    unitPrice: 0,
    unit: '',
    location: '',
    movementCode: '',
    category: 'mercancia'
  };

  // --- Purchase form ---
  purchaseForm: FormGroup = this.fb.group({
    entity: ['', Validators.required],
    warehouse: ['', Validators.required],
    supplier: ['', Validators.required],
    document: ['', Validators.required],
    products: this.fb.array<FormGroup>([]),
  });

  get products(): FormArray<FormGroup> {
    return this.purchaseForm.get('products') as FormArray<FormGroup>;
  }

  expenseElements = EXPENSE_ELEMENTS;

  get isPurchaseType(): boolean {
    const type = this.selectedType();
    return type ? PURCHASE_CODES.includes(type.code) : false;
  }

  get isCostCenterType(): boolean {
    const type = this.selectedType();
    return type ? COST_CENTER_ENTRY_CODES.includes(type.code) : false;
  }

  get modalTitle(): string {
    switch (this.step()) {
      case 'select-type': return 'Nueva Entrada de Inventario';
      case 'simple-form': return `Entrada: ${this.selectedType()?.description || ''}`;
      case 'purchase-form': return `Compra: ${this.selectedType()?.description || ''}`;
    }
  }

  get confirmText(): string {
    switch (this.step()) {
      case 'select-type': return 'Continuar';
      case 'simple-form': return 'Registrar Entrada';
      case 'purchase-form': return 'Registrar Compra';
    }
  }

  // --- Type selection ---
  selectType(type: MovementTypeOption): void {
    this.selectedType.set(type);
  }

  // --- Navigation ---
  onConfirm(): void {
    switch (this.step()) {
      case 'select-type':
        this.goToForm();
        break;
      case 'simple-form':
        this.confirmSimpleEntry();
        break;
      case 'purchase-form':
        this.confirmPurchase();
        break;
    }
  }

  onClose(): void {
    this.reset();
    this.closeEvent.emit();
  }

  goBack(): void {
    this.step.set('select-type');
  }

  private goToForm(): void {
    const type = this.selectedType();
    if (!type) return;

    if (PURCHASE_CODES.includes(type.code)) {
      this.initPurchaseForm(type);
      this.step.set('purchase-form');
    } else {
      this.initSimpleForm(type);
      this.step.set('simple-form');
    }
  }

  // --- Simple entry ---
  private initSimpleForm(type: MovementTypeOption): void {
    this.directEntry = {
      productCode: '',
      productName: '',
      productDescription: '',
      quantity: 1,
      label: '',
      warehouseId: '',
      entity: '',
      unitPrice: 0,
      unit: '',
      location: '',
      movementCode: type.code,
      category: type.category,
      expenseElement: ''
    };
    this.productSearchTerm = '';
    this.filteredProducts = [];
    this.showProductDropdown = false;
  }

  private confirmSimpleEntry(): void {
    if (!this.directEntry.productCode?.trim()) return;
    if (!this.directEntry.productName?.trim()) return;
    if (!this.directEntry.quantity || this.directEntry.quantity <= 0) return;
    if (!this.directEntry.warehouseId?.trim()) return;

    this.submitDirectEntry.emit({ 
      ...this.directEntry,
      debitAccountCode: this.selectedDebitAccount()?.code,
      creditAccountCode: this.selectedCreditAccount()?.code,
    });
    this.reset();
    this.closeEvent.emit();
  }

  // --- Purchase ---
  private initPurchaseForm(type: MovementTypeOption): void {
    this.purchaseForm.reset();
    this.products.clear();
    this.addProduct();
  }

  addProduct(): void {
    const group = this.fb.group({
      code: ['', Validators.required],
      description: ['', Validators.required],
      unit: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      unitPrice: [{ value: 0, disabled: true }],
      expirationDate: ['', this.dateValidator],
    });
    this.subscribeToProductChanges(group);
    this.products.push(group);
  }

  // --- Purchase autocomplete methods ---
  onPurchaseCodeSearch(term: string, rowIndex: number): void {
    console.log('🔍 ENTRY WIZARD - Buscando producto por código:', {
      term,
      rowIndex,
      totalProducts: this.allProducts.length
    });
    
    if (!term || term.length < 1) {
      this.closePurchaseDropdown();
      return;
    }
    const lower = term.toLowerCase();
    this.purchaseFilteredProducts = this.allProducts.filter(p =>
      p.productCode.toLowerCase().includes(lower)
    ).slice(0, 8);
    
    console.log('✅ ENTRY WIZARD - Productos filtrados por código:', {
      term,
      resultados: this.purchaseFilteredProducts.length,
      productos: this.purchaseFilteredProducts
    });
    
    this.purchaseDropdownRow = rowIndex;
    this.purchaseDropdownField = 'code';
  }

  onPurchaseDescSearch(term: string, rowIndex: number): void {
    if (!term || term.length < 1) {
      this.closePurchaseDropdown();
      return;
    }
    const lower = term.toLowerCase();
    this.purchaseFilteredProducts = this.allProducts.filter(p =>
      p.productName.toLowerCase().includes(lower)
    ).slice(0, 8);
    this.purchaseDropdownRow = rowIndex;
    this.purchaseDropdownField = 'description';
  }

  selectPurchaseProduct(product: any, rowIndex: number): void {
    const group = this.products.at(rowIndex);
    group.get('code')?.setValue(product.productCode);
    group.get('description')?.setValue(product.productName);
    if (product.productUnit) {
      group.get('unit')?.setValue(product.productUnit);
    }
    this.closePurchaseDropdown();
  }

  closePurchaseDropdown(): void {
    this.purchaseFilteredProducts = [];
    this.purchaseDropdownRow = -1;
    this.purchaseDropdownField = null;
  }

  hidePurchaseDropdown(): void {
    setTimeout(() => this.closePurchaseDropdown(), 200);
  }

  // --- Warehouse autocomplete methods ---
  onWarehouseSearch(term: string): void {
    this.warehouseSearchTerm = term;
    if (!term || term.length < 1) {
      this.filteredWarehouses = this.warehouses;
      this.showWarehouseDropdown = this.warehouses.length > 0;
      return;
    }
    const lower = term.toLowerCase();
    this.filteredWarehouses = this.warehouses.filter(wh =>
      wh.name.toLowerCase().includes(lower)
    );
    this.showWarehouseDropdown = this.filteredWarehouses.length > 0;
  }

  selectWarehouse(wh: { id: string; name: string }): void {
    this.warehouseSearchTerm = wh.name;
    this.purchaseForm.get('warehouse')?.setValue(wh.id);
    this.showWarehouseDropdown = false;
  }

  hideWarehouseDropdown(): void {
    setTimeout(() => { this.showWarehouseDropdown = false; }, 200);
  }

  removeProduct(index: number): void {
    this.products.removeAt(index);
  }

  private subscribeToProductChanges(group: FormGroup): void {
    group.get('quantity')?.valueChanges.subscribe(() => this.updateUnitPrice(group));
    group.get('amount')?.valueChanges.subscribe(() => this.updateUnitPrice(group));
  }

  private updateUnitPrice(group: FormGroup): void {
    const qty = group.get('quantity')?.value || 0;
    const amt = group.get('amount')?.value || 0;
    group.get('unitPrice')?.setValue(qty > 0 ? amt / qty : 0, { emitEvent: false });
  }

  private dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const d = new Date(control.value);
    return isNaN(d.getTime()) ? { invalidDate: true } : null;
  }

  private formatExpirationDate(value: string | null): string | null {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private confirmPurchase(): void {
    if (this.purchaseForm.invalid) return;

    const raw = this.purchaseForm.value;
    const type = this.selectedType()!;

    const debitCode = this.selectedDebitAccount()?.code;
    const creditCode = this.selectedCreditAccount()?.code;

    console.log('🧾 [Wizard] Confirmando compra - Cuentas seleccionadas:', {
      debit: debitCode,
      credit: creditCode,
      debitAccount: this.selectedDebitAccount(),
      creditAccount: this.selectedCreditAccount()
    });

    const payload: CreatePurchasePayload & { movementCode: string; category: InventoryCategory } = {
      entity: raw.entity,
      warehouse: raw.warehouse,
      supplier: raw.supplier,
      document: raw.document,
      movementCode: type.code,
      category: type.category,
      products: (raw.products as any[]).map((p: any, i: number) => ({
        product_code: p.code,
        product_name: p.description,
        quantity: parseFloat(p.quantity),
        unit_price: this.products.at(i).get('unitPrice')?.value ?? 0,
        unit: p.unit || null,
        expiration_date: this.formatExpirationDate(p.expirationDate),
      })),
    };

    this.submitPurchase.emit({
      ...payload,
      debitAccountCode: debitCode,
      creditAccountCode: creditCode,
    });
    this.reset();
    this.closeEvent.emit();
  }

  getUnitPrice(index: number): number {
    return this.products.at(index).get('unitPrice')?.value ?? 0;
  }

  getTotalAmount(): number {
    return this.products.controls.reduce((sum, g) => {
      return sum + (g.get('amount')?.value || 0);
    }, 0);
  }

  fieldInvalid(path: string): boolean {
    const ctrl = this.purchaseForm.get(path);
    return !!(ctrl?.invalid && (ctrl.touched || ctrl.dirty));
  }

  productFieldInvalid(group: FormGroup, field: string): boolean {
    const ctrl = group.get(field);
    return !!(ctrl?.invalid && (ctrl.touched || ctrl.dirty));
  }

  private reset(): void {
    this.step.set('select-type');
    this.selectedType.set(null);
    this.purchaseForm.reset();
    this.products.clear();
    this.productSearchTerm = '';
    this.filteredProducts = [];
    this.showProductDropdown = false;
    this.warehouseSearchTerm = '';
    this.filteredWarehouses = [];
    this.showWarehouseDropdown = false;
  }

  // --- Category helpers ---
  categoryLabel(cat: InventoryCategory): string {
    const map: Record<string, string> = { insumo: 'Insumo', mercancia: 'Mercancía', produccion: 'Producción' };
    return map[cat] ?? cat;
  }

  categoryClass(cat: InventoryCategory): string {
    switch (cat) {
      case 'insumo': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'mercancia': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'produccion': return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  }

  // --- Métodos para selección de cuentas contables ---
  onDebitAccountSelected(account: Account | null): void {
    console.log(`🔹 [Wizard] Débito seleccionado:`, account?.code);
    this.selectedDebitAccount.set(account);
  }

  onCreditAccountSelected(account: Account | null): void {
    console.log(`🔹 [Wizard] Crédito seleccionado:`, account?.code);
    this.selectedCreditAccount.set(account);
  }

  // === NUEVOS MÉTODOS: NATURALEZA PARA DÉBITO Y CRÉDITO ===
  getDebitNature(): 'deudora' | undefined {
    return 'deudora';
  }

  getCreditNature(): 'acreedora' | undefined {
    return 'acreedora';
  }

  // --- Nueva UI: Métodos para categorización profesional ---
  getCategoriesByTypes() {
    const categories = [
      {
        name: 'Insumos',
        description: 'Materias primas, materiales y suministros de producción',
        color: 'bg-purple-500',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-700',
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
        dotColor: 'bg-purple-500',
        types: this.entryTypes.filter(t => t.category === 'insumo')
      },
      {
        name: 'Mercancías',
        description: 'Productos terminados y bienes para la venta',
        color: 'bg-indigo-500',
        bgColor: 'bg-indigo-100',
        borderColor: 'border-indigo-300',
        textColor: 'text-indigo-700',
        badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        dotColor: 'bg-indigo-500',
        types: this.entryTypes.filter(t => t.category === 'mercancia')
      },
      {
        name: 'Producción',
        description: 'Productos de proceso y producción interna',
        color: 'bg-teal-500',
        bgColor: 'bg-teal-100',
        borderColor: 'border-teal-300',
        textColor: 'text-teal-700',
        badgeClass: 'bg-teal-100 text-teal-700 border-teal-200',
        dotColor: 'bg-teal-500',
        types: this.entryTypes.filter(t => t.category === 'produccion')
      }
    ];
    
    return categories.filter(cat => cat.types.length > 0);
  }

  // Helper para verificar si un código específico es de compra
  isPurchaseTypeByCode(code: string): boolean {
    return PURCHASE_CODES.includes(code);
  }
}