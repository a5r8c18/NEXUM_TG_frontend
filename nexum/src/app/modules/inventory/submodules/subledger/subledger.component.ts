import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../../../core/services/inventory.service';
import { AuthService } from '../../../../core/services/auth.service';

interface SubledgerMovement {
  id: string;
  date: string | null;
  movementType: string;
  movementCode: string;
  movementDescription: string;
  referenceNumber?: string;
  documentNumber?: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitPrice: number;
  totalValue: number;
  entityName?: string;
  notes?: string;
}

interface SubledgerData {
  productCode: string;
  productName: string;
  productUnit?: string;
  warehouseId: string;
  warehouseName: string;
  currentBalance: number;
  unitPrice: number;
  initialBalance: number;
  movements: SubledgerMovement[];
}

@Component({
  selector: 'app-subledger',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <button (click)="goBack()" class="text-sm text-slate-600 hover:text-slate-900 mb-2">← Volver al inventario</button>
          <h1 class="text-2xl font-bold dark:text-white">Tarjeta de Estiba</h1>
          @if (subledger()) {
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ subledger()?.productName }} ({{ subledger()?.productCode }}) — Almacén: {{ subledger()?.warehouseName }}
            </p>
          }
        </div>
      </div>

      @if (isLoading()) {
        <div class="text-center py-20 text-slate-500">Cargando submayor...</div>
      } @else if (error()) {
        <div class="text-center py-20 text-red-600">{{ error() }}</div>
      } @else if (subledger()) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 uppercase">Existencia actual</p>
            <p class="text-xl font-bold dark:text-white">{{ subledger()?.currentBalance | number:'1.2-2' }} {{ subledger()?.productUnit }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 uppercase">Costo unitario (CPP)</p>
            <p class="text-xl font-bold dark:text-white">{{ subledger()?.unitPrice | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 uppercase">Valor total</p>
            <p class="text-xl font-bold dark:text-white">{{ (subledger()?.currentBalance || 0) * (subledger()?.unitPrice || 0) | number:'1.2-2' }}</p>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Movimiento</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Documento</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Entrada</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Salida</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Saldo</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Precio</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Valor</th>
              </tr>
            </thead>
            <tbody>
              @for (m of subledger()?.movements; track m.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700">
                  <td class="px-4 py-3 dark:text-slate-300">{{ m.date | date:'yyyy-MM-dd' }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ m.movementCode }} — {{ m.movementDescription }}</td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ m.documentNumber || m.referenceNumber || '—' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ m.quantityIn ? (m.quantityIn | number:'1.2-2') : '—' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ m.quantityOut ? (m.quantityOut | number:'1.2-2') : '—' }}</td>
                  <td class="px-4 py-3 text-right font-semibold dark:text-slate-300">{{ m.balance | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ m.unitPrice | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right dark:text-slate-300">{{ m.totalValue | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class SubledgerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);

  subledger = signal<SubledgerData | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const warehouseId = this.route.snapshot.paramMap.get('warehouseId') || '';
    const productCode = this.route.snapshot.paramMap.get('productCode') || '';
    const companyId = this.authService.getCurrentCompanyId();

    if (!warehouseId || !productCode) {
      this.error.set('Almacén y producto son requeridos');
      return;
    }

    this.isLoading.set(true);
    this.inventoryService.getSubledger(warehouseId, productCode, companyId).subscribe({
      next: (data) => { this.subledger.set(data); this.isLoading.set(false); },
      error: () => { this.error.set('Error cargando la tarjeta de estiba'); this.isLoading.set(false); },
    });
  }

  goBack(): void {
    this.router.navigate(['/inventory']);
  }
}
