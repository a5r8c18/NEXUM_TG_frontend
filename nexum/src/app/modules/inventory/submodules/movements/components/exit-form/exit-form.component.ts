import { Component, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { MovementTypeOption, InventoryCategory, ExitDto, ExitItemDto, MovementItem } from '../../../../../../models/inventory.models';

// Códigos de salida a centro de costo que requieren elemento de gasto
const COST_CENTER_EXIT_CODES = ['1105', '2105', '3105'];

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
  selector: 'app-exit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './exit-form.component.html',
})
export class ExitFormComponent {
  @Input() isOpen = false;
  @Input() exitTypes: MovementTypeOption[] = [];
  @Input() selectedMovement: MovementItem | null = null;

  @Output() closeEvent = new EventEmitter<void>();
  @Output() submitExit = new EventEmitter<ExitDto>();

  expenseElements = EXPENSE_ELEMENTS;

  // Form state (single-product for now, will emit as items[])
  productCode = '';
  quantity = 1;
  reason = '';
  entity = '';
  warehouseId = '';
  unit = '';
  unitPrice = 0;
  movementCode = '';
  category: InventoryCategory = 'mercancia';
  expenseElement = '';

  selectedType = signal<MovementTypeOption | null>(null);

  ngOnChanges(): void {
    if (this.selectedMovement && this.isOpen) {
      const m = this.selectedMovement;
      this.productCode = m.product.productCode;
      this.quantity = 1;
      this.reason = '';
      this.entity = m.product.entity ?? '';
      this.warehouseId = m.product.warehouseId ?? '';
      this.unit = m.product.productUnit ?? '';
      this.unitPrice = m.product.unitPrice ?? 0;
      this.movementCode = '';
      this.category = (m.category as InventoryCategory) || 'mercancia';
      this.expenseElement = '';
      this.selectedType.set(null);
    }
  }

  get isCostCenterExit(): boolean {
    return COST_CENTER_EXIT_CODES.includes(this.movementCode || '');
  }

  selectType(type: MovementTypeOption): void {
    this.selectedType.set(type);
    this.movementCode = type.code;
    this.category = type.category;
    this.expenseElement = '';
  }

  onConfirm(): void {
    if (!this.movementCode?.trim()) return;
    const qty = Math.max(1, Number(this.quantity) || 1);
    if (qty <= 0) return;

    const item: ExitItemDto = {
      productCode: this.productCode,
      quantity: qty,
      expenseElement: this.expenseElement || undefined,
    };

    const payload: ExitDto = {
      movementCode: this.movementCode,
      category: this.category,
      warehouseId: this.warehouseId,
      reason: this.reason || undefined,
      entity: this.entity || undefined,
      expenseElement: this.expenseElement || undefined,
      items: [item],
    };

    this.submitExit.emit(payload);
    this.onClose();
  }

  onClose(): void {
    this.selectedType.set(null);
    this.closeEvent.emit();
  }

  get totalAmount(): number {
    return (Number(this.quantity) || 0) * (this.unitPrice || 0);
  }

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
}
