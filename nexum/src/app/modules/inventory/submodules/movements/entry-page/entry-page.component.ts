import { Component, signal, inject, OnInit, computed, ElementRef, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AccountSelectorComponent } from '../../../../../shared/components/account-selector/account-selector.component';
import { MovementTypeOption } from '../../../../../models/inventory.models';
import { CreatePurchasePayload } from '../../../../../models/purchase.models';
import { MovementsService } from '../../../../../core/services/movements.service';
import { WarehouseService } from '../../../../../core/services/warehouse.service';
import { ProductsService } from '../../../../../core/services/products.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { OfflineFirstService } from '../../../../../core/offline/offline-first.service';
import { Account } from '../../../../../core/services/accounting.service';

const PURCHASE_CODES = ['102', '202', '402'];
const COST_CENTER_ENTRY_CODES = ['108', '208', '308'];
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
  selector: 'app-entry-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AccountSelectorComponent],
  templateUrl: './entry-page.component.html',
})
export class EntryPageComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private movementsService = inject(MovementsService);
  private warehouseService = inject(WarehouseService);
  private productsService = inject(ProductsService);
  private notificationService = inject(NotificationService);
  private offlineFirst = inject(OfflineFirstService);
  private cdr = inject(ChangeDetectorRef);

  // State
  isLoading = signal(false);
  isSubmitting = signal(false);
  entryTypes = signal<MovementTypeOption[]>([]);
  warehouses = signal<{ id: string; name: string }[]>([]);
  allProducts: any[] = [];

  // Tipo de movimiento — plegable
  typesPanelOpen = signal(true);

  // Form mode derived from selected type
  selectedTypeCode = signal<string>('');
  isPurchaseMode = computed(() => PURCHASE_CODES.includes(this.selectedTypeCode()));
  selectedType = computed(() =>
    this.entryTypes().find((t) => t.code === this.selectedTypeCode()) ?? null
  );
  isCostCenterType = computed(() =>
    COST_CENTER_ENTRY_CODES.includes(this.selectedTypeCode())
  );

  expenseElements = EXPENSE_ELEMENTS;

  // Accounting accounts
  selectedDebitAccount = signal<Account | null>(null);
  selectedCreditAccount = signal<Account | null>(null);

  // Formulario unificado — siempre usa FormArray de productos
  entryForm: FormGroup = this.fb.group({
    entity: ['', Validators.required],
    warehouseId: ['', Validators.required],
    supplier: [''],
    document: [''],
    expenseElement: [''],
    label: [''],
    // Transportista (solo compra)
    transportistaNombre: [''],
    transportistaCi: [''],
    transportistaChapa: [''],
    // Responsables (solo compra)
    jefeAlmacen: [''],
    recepcionadoPor: [''],
    anotadoPor: [''],
    contabilizadoPor: [''],
    products: this.fb.array<FormGroup>([]),
  });

  // Autocomplete almacén — dropdown fixed
  warehouseSearchTerm = '';
  filteredWarehouses: { id: string; name: string }[] = [];
  showWarehouseDropdown = false;
  warehouseDropdownTop = 0;
  warehouseDropdownLeft = 0;
  warehouseDropdownWidth = 0;

  // Autocomplete productos en tabla — dropdown fixed
  prodFilteredProducts: any[] = [];
  prodDropdownRow = -1;   // fila activa (se mantiene hasta después del click)
  prodDropdownField: 'code' | 'description' | null = null;
  prodDropdownTop = 0;
  prodDropdownLeft = 0;
  prodDropdownWidth = 0;
  private _pendingClose: any = null;

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChildren('descInput') descInputs!: QueryList<ElementRef<HTMLInputElement>>;

  get products(): FormArray<FormGroup> {
    return this.entryForm.get('products') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.movementsService.getMovementTypes('entry').subscribe({
      next: (types) => {
        this.entryTypes.set(types);
        if (types.length > 0) {
          this.selectedTypeCode.set(types[0].code);
          this.resetForm();
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.warehouseService.getWarehouses().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.warehouses ?? data ?? []);
        this.warehouses.set(list.map((w: any) => ({ id: w.id, name: w.name })));
        this.filteredWarehouses = this.warehouses();
      },
      error: () => {},
    });

    this.productsService.getAll({ isActive: true }).subscribe({
      next: (data: any) => { this.allProducts = data.items ?? data ?? []; },
      error: () => { this.allProducts = []; },
    });
  }

  onTypeChange(code: string): void {
    this.selectedTypeCode.set(code);
    this.resetForm();
    // Cerrar el panel tras seleccionar
    this.typesPanelOpen.set(false);
  }

  private resetForm(): void {
    this.entryForm.reset();
    this.products.clear();
    this.addProduct();
    this.selectedDebitAccount.set(null);
    this.selectedCreditAccount.set(null);
    this.warehouseSearchTerm = '';
    this.filteredWarehouses = this.warehouses();
    // supplier/document solo requeridos en modo compra
    const isPurchase = this.isPurchaseMode();
    this.entryForm.get('supplier')?.setValidators(isPurchase ? [Validators.required] : []);
    this.entryForm.get('document')?.setValidators(isPurchase ? [Validators.required] : []);
    this.entryForm.get('supplier')?.updateValueAndValidity();
    this.entryForm.get('document')?.updateValueAndValidity();
  }

  // ── Tabla de productos ──────────────────────────────────────────────────────

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
    group.get('quantity')?.valueChanges.subscribe(() => this.updateUnitPrice(group));
    group.get('amount')?.valueChanges.subscribe(() => this.updateUnitPrice(group));
    this.products.push(group);
  }

  removeProduct(i: number): void { if (this.products.length > 1) this.products.removeAt(i); }

  getUnitPrice(i: number): number {
    const g = this.products.at(i);
    const qty = Number(g.get('quantity')?.value) || 0;
    const amt = Number(g.get('amount')?.value) || 0;
    return qty > 0 ? amt / qty : 0;
  }

  onAmountInput(value: string, row: number, inputEl: HTMLInputElement): void {
    const num = parseFloat(value);
    const g = this.products.at(row);
    g.get('amount')?.setValue(isNaN(num) ? 0 : num);
    this.cdr.detectChanges();
  }

  onQuantityInput(value: string, row: number, inputEl: HTMLInputElement): void {
    const num = parseInt(value, 10);
    const g = this.products.at(row);
    g.get('quantity')?.setValue(isNaN(num) || num < 1 ? 1 : num);
    this.cdr.detectChanges();
  }

  getTotalAmount(): number {
    return this.products.controls.reduce((s, g) => s + (g.get('amount')?.value || 0), 0);
  }

  private updateUnitPrice(group: FormGroup): void {
    const qty = group.get('quantity')?.value || 0;
    const amt = group.get('amount')?.value || 0;
    group.get('unitPrice')?.setValue(qty > 0 ? amt / qty : 0, { emitEvent: false });
  }

  private dateValidator(ctrl: AbstractControl): ValidationErrors | null {
    if (!ctrl.value) return null;
    return isNaN(new Date(ctrl.value).getTime()) ? { invalidDate: true } : null;
  }

  private formatDate(val: string | null): string | null {
    if (!val) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  // ── Autocomplete productos en tabla (fixed dropdown) ───────────────────────

  onProdCodeSearch(term: string, row: number, inputEl: HTMLInputElement): void {
    if (!term) { this.closeProdDropdown(); return; }
    const lower = term.toLowerCase();
    this.prodFilteredProducts = this.allProducts.filter(p => p.productCode?.toLowerCase().includes(lower)).slice(0, 8);
    this.prodDropdownRow = row;
    this.prodDropdownField = 'code';
    this.updateProdDropdownPos(inputEl);
  }

  onProdDescSearch(term: string, row: number, inputEl: HTMLInputElement): void {
    if (!term) { this.closeProdDropdown(); return; }
    const lower = term.toLowerCase();
    this.prodFilteredProducts = this.allProducts.filter(p => p.productName?.toLowerCase().includes(lower)).slice(0, 8);
    this.prodDropdownRow = row;
    this.prodDropdownField = 'description';
    this.updateProdDropdownPos(inputEl);
  }

  private updateProdDropdownPos(el: HTMLInputElement): void {
    const r = el.getBoundingClientRect();
    this.prodDropdownTop = r.bottom + 4;
    this.prodDropdownLeft = r.left;
    this.prodDropdownWidth = r.width;
  }

  onProdDropdownMousedown(event: MouseEvent, product: any): void {
    event.preventDefault();   // evita que el input pierda el foco (blur no se dispara)
    event.stopPropagation();
    // En este punto prodDropdownRow aún es válido porque blur no se ejecutó
    const row = this.prodDropdownRow;
    if (row < 0 || row >= this.products.length) return;
    const g = this.products.at(row);
    g.patchValue({
      code: product.productCode,
      description: product.productName,
      unit: product.productUnit || 'und',
    });
    // Forzar el reflejo en el DOM (writeValue del accessor no siempre llega aquí)
    const codeEl = this.codeInputs?.get(row)?.nativeElement;
    const descEl = this.descInputs?.get(row)?.nativeElement;
    if (codeEl) codeEl.value = product.productCode;
    if (descEl) descEl.value = product.productName;
    this.closeProdDropdown();
    this.cdr.detectChanges();
  }

  closeProdDropdown(): void { this.prodFilteredProducts = []; this.prodDropdownRow = -1; this.prodDropdownField = null; }
  hideProdDropdown(): void {
    if (this._pendingClose) clearTimeout(this._pendingClose);
    this._pendingClose = setTimeout(() => { this._pendingClose = null; this.closeProdDropdown(); }, 300);
  }

  // ── Autocomplete almacén (fixed dropdown) ──────────────────────────────────

  onWarehouseSearch(term: string, inputEl: HTMLInputElement): void {
    this.warehouseSearchTerm = term;
    const lower = term.toLowerCase();
    this.filteredWarehouses = !term
      ? this.warehouses()
      : this.warehouses().filter(w => w.name.toLowerCase().includes(lower));
    const r = inputEl.getBoundingClientRect();
    this.warehouseDropdownTop = r.bottom + 4;
    this.warehouseDropdownLeft = r.left;
    this.warehouseDropdownWidth = r.width;
    this.showWarehouseDropdown = true;
  }

  onWarehouseFocus(inputEl: HTMLInputElement): void {
    this.filteredWarehouses = this.warehouses();
    const r = inputEl.getBoundingClientRect();
    this.warehouseDropdownTop = r.bottom + 4;
    this.warehouseDropdownLeft = r.left;
    this.warehouseDropdownWidth = r.width;
    this.showWarehouseDropdown = true;
  }

  selectWarehouse(wh: { id: string; name: string }): void {
    this.warehouseSearchTerm = wh.name;
    this.entryForm.get('warehouseId')?.setValue(wh.id);
    this.showWarehouseDropdown = false;
  }

  hideWarehouseDropdown(): void { setTimeout(() => { this.showWarehouseDropdown = false; }, 200); }

  // ── Accounting accounts ────────────────────────────────────────────────────

  onDebitAccountSelected(account: Account | null): void { this.selectedDebitAccount.set(account); }
  onCreditAccountSelected(account: Account | null): void { this.selectedCreditAccount.set(account); }

  // ── Form helpers ──────────────────────────────────────────────────────────

  fieldInvalid(path: string): boolean {
    const c = this.entryForm.get(path);
    return !!(c?.invalid && (c.touched || c.dirty));
  }

  productFieldInvalid(group: FormGroup, field: string): boolean {
    const c = group.get(field);
    return !!(c?.invalid && (c.touched || c.dirty));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      this.notificationService.showError('Completa los campos obligatorios');
      return;
    }
    const raw = this.entryForm.getRawValue();
    if (this.isPurchaseMode()) {
      this.submitPurchase(raw);
    } else {
      this.submitDirectEntries(raw);
    }
  }

  private submitDirectEntries(raw: any): void {
    this.isSubmitting.set(true);
    const category = this.selectedType()?.category ?? 'mercancia';
    const calls = (raw.products as any[]).map((p: any, i: number) =>
      this.offlineFirst.registerDirectEntry({
        productCode: p.code,
        productName: p.description,
        productDescription: '',
        quantity: parseFloat(p.quantity),
        unitPrice: this.getUnitPrice(i),
        unit: p.unit || '',
        warehouseId: raw.warehouseId,
        entity: raw.entity || '',
        label: raw.label || '',
        location: '',
        movementCode: this.selectedTypeCode(),
        category,
        expenseElement: raw.expenseElement || '',
        debitAccountCode: this.selectedDebitAccount()?.code,
        creditAccountCode: this.selectedCreditAccount()?.code,
      })
    );
    // Registrar secuencialmente
    const next = (idx: number) => {
      if (idx >= calls.length) {
        this.notificationService.showSuccess('Entrada registrada correctamente');
        this.isSubmitting.set(false);
        this.router.navigate(['/inventory/movements']);
        return;
      }
      calls[idx].subscribe({ next: () => next(idx + 1), error: () => { this.notificationService.showError('Error al registrar entrada'); this.isSubmitting.set(false); } });
    };
    next(0);
  }

  private submitPurchase(raw: any): void {
    const payload: CreatePurchasePayload = {
      entity: raw.entity,
      warehouse: raw.warehouseId,
      supplier: raw.supplier,
      document: raw.document,
      products: (raw.products as any[]).map((p: any, i: number) => ({
        product_code: p.code,
        product_name: p.description,
        quantity: parseFloat(p.quantity),
        unit_price: this.getUnitPrice(i),
        unit: p.unit || null,
        expiration_date: this.formatDate(p.expirationDate),
      })),
      debitAccountCode: this.selectedDebitAccount()?.code,
      creditAccountCode: this.selectedCreditAccount()?.code,
      // Transportista y responsables
      transportista: {
        nombre: raw.transportistaNombre || null,
        ci: raw.transportistaCi || null,
        chapa: raw.transportistaChapa || null,
      },
      responsables: {
        jefeAlmacen: raw.jefeAlmacen || null,
        recepcionadoPor: raw.recepcionadoPor || null,
        anotadoPor: raw.anotadoPor || null,
        contabilizadoPor: raw.contabilizadoPor || null,
      },
    };
    this.isSubmitting.set(true);
    this.offlineFirst.createPurchase(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess('Compra registrada correctamente');
        this.isSubmitting.set(false);
        this.router.navigate(['/inventory/movements']);
      },
      error: () => {
        this.notificationService.showError('Error al registrar compra');
        this.isSubmitting.set(false);
      },
    });
  }

  goBack(): void { this.router.navigate(['/inventory/movements']); }

  getCategoriesByTypes() {
    const defs = [
      { name: 'Insumos', cat: 'insumo' },
      { name: 'Mercancías', cat: 'mercancia' },
      { name: 'Producción', cat: 'produccion' },
    ];
    return defs.map(d => ({ ...d, types: this.entryTypes().filter((t: MovementTypeOption) => t.category === d.cat) })).filter(d => d.types.length > 0);
  }

  isPurchaseCode(code: string): boolean { return PURCHASE_CODES.includes(code); }
}
