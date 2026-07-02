import { Component, signal, inject, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { ReturnDto, InventoryCategory, InventoryItem } from '../../../../../../models/inventory.models';
import { PurchasesService } from '../../../../../../core/services/purchases.service';
import { InventoryService } from '../../../../../../core/services/inventory.service';
import { Purchase } from '../../../../../../models/purchase.models';

interface ReturnLine {
  productCode: string;
  productName: string;
  productUnit: string;
  unitPrice: number;
  category: InventoryCategory | null;
  maxQuantity: number;
  quantity: number;
  selected: boolean;
}

@Component({
  selector: 'app-return-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './return-wizard.component.html',
})
export class ReturnWizardComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() warehouses: { id: string; name: string }[] = [];

  @Output() closeEvent = new EventEmitter<void>();
  @Output() submitReturn = new EventEmitter<ReturnDto>();

  private purchasesService = inject(PurchasesService);
  private inventoryService = inject(InventoryService);

  isLoadingPurchases = signal(false);
  isLoading = signal(false);
  loadError = signal(false);
  purchases = signal<Purchase[]>([]);
  lines = signal<ReturnLine[]>([]);
  selectedPurchaseId = '';
  warehouseId = '';
  reason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.reset();
      this.loadPurchases();
    }
  }

  private reset(): void {
    this.selectedPurchaseId = '';
    this.warehouseId = '';
    this.reason = '';
    this.lines.set([]);
    this.loadError.set(false);
  }

  private loadPurchases(): void {
    this.isLoadingPurchases.set(true);
    this.purchasesService.getPurchases().subscribe({
      next: (data) => {
        this.purchases.set(data || []);
        this.isLoadingPurchases.set(false);
      },
      error: (err) => {
        console.error('❌ Error cargando compras:', err);
        this.purchases.set([]);
        this.isLoadingPurchases.set(false);
      },
    });
  }

  onPurchaseChange(): void {
    this.lines.set([]);
    this.loadError.set(false);
    if (!this.selectedPurchaseId) return;

    this.isLoading.set(true);
    this.purchasesService.getPurchaseById(this.selectedPurchaseId).subscribe({
      next: (res) => {
        const products = res?.products || [];
        this.lines.set(
          products.map((p) => ({
            productCode: p.productCode,
            productName: p.productName,
            productUnit: p.productUnit || 'und',
            unitPrice: 0, // Se actualiza con el costo actual del inventario
            category: (p.category as InventoryCategory) || null,
            maxQuantity: p.quantity,
            quantity: p.quantity,
            selected: true,
          }))
        );
        // Preseleccionar el almacén de la compra por nombre
        const whName = res?.purchase?.warehouse;
        const match = this.warehouses.find((w) => w.name === whName);
        this.warehouseId = match?.id || '';
        this.updateUnitPricesFromInventory();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error cargando productos de la compra:', err);
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  onWarehouseChange(): void {
    this.updateUnitPricesFromInventory();
  }

  private updateUnitPricesFromInventory(): void {
    if (!this.warehouseId || this.lines().length === 0) return;

    this.inventoryService.getInventory({ warehouse: this.warehouseId, isActive: true }).subscribe({
      next: (data: InventoryItem[]) => {
        const inventory = data || [];
        const updatedLines = this.lines().map((line) => {
          const invItem = inventory.find((i) => i.productCode === line.productCode);
          return {
            ...line,
            unitPrice: invItem?.unitPrice || 0,
          };
        });
        this.lines.set(updatedLines);
      },
      error: (err) => {
        console.error('❌ Error cargando precios de inventario:', err);
      }
    });
  }

  get selectedLines(): ReturnLine[] {
    return this.lines().filter((l) => l.selected && l.quantity > 0);
  }

  get selectedCategory(): InventoryCategory | null {
    const cats = new Set(this.selectedLines.map((l) => l.category));
    return cats.size === 1 ? ([...cats][0] as InventoryCategory) : null;
  }

  get categoryConflict(): boolean {
    const cats = new Set(this.selectedLines.map((l) => l.category));
    return cats.size > 1;
  }

  get movementCode(): string {
    const map: Record<string, string> = { insumo: '1107', mercancia: '2107' };
    const cat = this.selectedCategory;
    return cat ? map[cat] || '' : '';
  }

  get unsupportedCategory(): boolean {
    return this.selectedLines.length > 0 && !this.categoryConflict && !this.movementCode;
  }

  get totalAmount(): number {
    return this.selectedLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  }

  get canSubmit(): boolean {
    return (
      !!this.movementCode &&
      !this.categoryConflict &&
      !!this.warehouseId &&
      this.selectedLines.length > 0 &&
      !!this.reason.trim()
    );
  }

  toggleSelect(index: number): void {
    const arr = [...this.lines()];
    arr[index] = { ...arr[index], selected: !arr[index].selected };
    this.lines.set(arr);
  }

  updateQuantity(index: number, value: number): void {
    const arr = [...this.lines()];
    let q = Number(value) || 0;
    if (q < 0) q = 0;
    if (q > arr[index].maxQuantity) q = arr[index].maxQuantity;
    arr[index] = { ...arr[index], quantity: q };
    this.lines.set(arr);
  }

  formatCurrency(amount?: number): string {
    if (!amount && amount !== 0) return '-';
    return '$' + amount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onClose(): void {
    this.closeEvent.emit();
  }

  onConfirm(): void {
    if (!this.canSubmit) return;

    const dto: ReturnDto = {
      movementCode: this.movementCode,
      category: this.selectedCategory || undefined,
      warehouseId: this.warehouseId,
      reason: this.reason.trim(),
      purchase_id: this.selectedPurchaseId || undefined,
      items: this.selectedLines.map((l) => ({
        productCode: l.productCode,
        quantity: l.quantity,
      })),
    };

    this.submitReturn.emit(dto);
  }
}
