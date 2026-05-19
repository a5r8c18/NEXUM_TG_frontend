import { Component, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../../../shared/components/modal/modal.component';
import { MovementItem, TransferDto } from '../../../../../../models/inventory.models';

@Component({
  selector: 'app-transfer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './transfer-form.component.html',
})
export class TransferFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() selectedMovement: MovementItem | null = null;
  @Input() warehouses: { id: string; name: string }[] = [];

  @Output() closeEvent = new EventEmitter<void>();
  @Output() submitTransfer = new EventEmitter<TransferDto>();

  selectedCategory: 'insumo' | 'mercancia' | 'produccion' = 'insumo';
  movementCode = '1102';
  productCode = '';
  quantity = 1;
  sourceWarehouseId = '';
  destinationWarehouseId = '';
  reason = 'Transferencia entre almacenes';

  categoryOptions = [
    { value: 'insumo', label: 'Insumo', code: '1102' },
    { value: 'mercancia', label: 'Mercancía', code: '2102' },
    { value: 'produccion', label: 'Producción', code: '3102' },
  ];

  ngOnChanges(): void {
    if (this.selectedMovement && this.isOpen) {
      this.selectedCategory = 'insumo';
      this.movementCode = '1102';
      this.productCode = this.selectedMovement.product.productCode;
      this.quantity = 1;
      this.sourceWarehouseId = this.selectedMovement.product.warehouseId || '';
      this.destinationWarehouseId = '';
      this.reason = 'Transferencia entre almacenes';
    }
  }

  onCategoryChange(): void {
    const opt = this.categoryOptions.find(c => c.value === this.selectedCategory);
    if (opt) {
      this.movementCode = opt.code;
    }
  }

  onConfirm(): void {
    if (!this.quantity || this.quantity <= 0) return;
    if (!this.sourceWarehouseId || !this.destinationWarehouseId) return;
    if (this.sourceWarehouseId === this.destinationWarehouseId) return;

    const payload: TransferDto = {
      movementCode: this.movementCode,
      category: this.selectedCategory,
      sourceWarehouseId: this.sourceWarehouseId,
      destinationWarehouseId: this.destinationWarehouseId,
      reason: this.reason || undefined,
      items: [{
        productCode: this.productCode,
        quantity: this.quantity,
      }],
    };

    this.submitTransfer.emit(payload);
    this.closeEvent.emit();
  }

  onClose(): void {
    this.closeEvent.emit();
  }
}
