import { Component, signal, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PurchasesService } from '../../../../core/services/purchases.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreatePurchasePayload } from '../../../../models/purchase.models';

@Component({
  selector: 'app-entry',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './entry.component.html',
})
export class EntryComponent {
  private fb = inject(FormBuilder);
  private purchasesService = inject(PurchasesService);
  private notificationService = inject(NotificationService);

  isSubmitting = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  purchaseForm: FormGroup = this.fb.group({
    entity: ['', Validators.required],
    warehouse: ['', Validators.required],
    supplier: ['', Validators.required],
    document: ['', Validators.required],
    products: this.fb.array<FormGroup>([]),
  });

  constructor() {
    this.addProduct();
  }

  get products(): FormArray<FormGroup> {
    return this.purchaseForm.get('products') as FormArray<FormGroup>;
  }

  private dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const d = new Date(control.value);
    return isNaN(d.getTime()) ? { invalidDate: true } : null;
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

  onSubmit(): void {
    if (this.purchaseForm.invalid) {
      this.markAllTouched(this.purchaseForm);
      this.showToast('Por favor, completa todos los campos obligatorios', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const raw = this.purchaseForm.value;

    const payload: CreatePurchasePayload = {
      entity: raw.entity,
      warehouse: raw.warehouse,
      supplier: raw.supplier,
      document: raw.document,
      products: (raw.products as any[]).map((p, i) => ({
        product_code: p.code,
        product_name: p.description,
        quantity: parseFloat(p.quantity),
        unit_price: this.products.at(i).get('unitPrice')?.value ?? 0,
        unit: p.unit || null,
        expiration_date: this.formatExpirationDate(p.expirationDate),
      })),
    };

    this.purchasesService.createPurchase(payload).subscribe({
      next: () => {
        this.showToast('Compra registrada exitosamente', 'success');
        this.notificationService.triggerRefresh();
        this.resetForm();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.showToast('Error al registrar la compra. Verifique el backend.', 'error');
        this.isSubmitting.set(false);
      },
    });
  }

  private resetForm(): void {
    this.purchaseForm.reset();
    this.products.clear();
    this.addProduct();
  }

  private markAllTouched(group: FormGroup): void {
    Object.keys(group.controls).forEach((key) => {
      const ctrl = group.get(key);
      if (ctrl instanceof FormGroup) {
        this.markAllTouched(ctrl);
      } else if (ctrl instanceof FormArray) {
        ctrl.controls.forEach((c) => {
          if (c instanceof FormGroup) this.markAllTouched(c);
          else c.markAsTouched();
        });
      } else {
        ctrl?.markAsTouched();
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }

  fieldInvalid(path: string): boolean {
    const ctrl = this.purchaseForm.get(path);
    return !!(ctrl?.invalid && (ctrl.touched || ctrl.dirty));
  }

  productFieldInvalid(group: FormGroup, field: string): boolean {
    const ctrl = group.get(field);
    return !!(ctrl?.invalid && (ctrl.touched || ctrl.dirty));
  }

  getUnitPrice(index: number): number {
    return this.products.at(index).get('unitPrice')?.value ?? 0;
  }

  getTotalAmount(): number {
    return this.products.controls.reduce((sum, g) => {
      return sum + (g.get('amount')?.value || 0);
    }, 0);
  }
}
