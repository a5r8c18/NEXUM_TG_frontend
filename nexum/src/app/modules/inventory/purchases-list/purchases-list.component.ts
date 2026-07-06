import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PurchasesService } from '../../../core/services/purchases.service';

@Component({
  selector: 'app-purchases-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold dark:text-white">Recepciones de Mercancía</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona el ciclo completo: Recepción → Factura → Conciliación</p>
        </div>
        <a routerLink="/inventory/entry/new"
           class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 w-fit">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Nueva Recepción
        </a>
      </div>

      <!-- Leyenda de estados del ciclo -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <div class="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
          <div>
            <p class="text-xs font-semibold text-blue-800 dark:text-blue-300">Recepción</p>
            <p class="text-xs text-blue-600 dark:text-blue-400">Deb 189 / Cred 189-01</p>
          </div>
        </div>
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <div class="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
          <div>
            <p class="text-xs font-semibold text-amber-800 dark:text-amber-300">Factura</p>
            <p class="text-xs text-amber-600 dark:text-amber-400">Deb 189-01 / Cred 410</p>
          </div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <div class="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
          <div>
            <p class="text-xs font-semibold text-green-800 dark:text-green-300">Conciliado</p>
            <p class="text-xs text-green-600 dark:text-green-400">Habilita pago</p>
          </div>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      } @else {
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Documento</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Proveedor</th>
                <th class="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                <th class="text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Total</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Ciclo</th>
                <th class="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of purchases(); track p.id) {
                <tr class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td class="px-4 py-3">
                    <span class="font-mono text-xs text-slate-700 dark:text-slate-300">{{ p.document }}</span>
                  </td>
                  <td class="px-4 py-3 dark:text-slate-300">{{ p.supplier }}</td>
                  <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{{ p.createdAt | date:'dd/MM/yyyy' }}</td>
                  <td class="px-4 py-3 text-right font-medium dark:text-slate-300">
                    {{ getTotal(p) | number:'1.2-2' }} CUP
                  </td>
                  <!-- Indicadores del ciclo -->
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1.5">
                      <span title="Recepción registrada"
                            class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">1</span>
                      <div class="w-4 h-px" [class]="p.isInvoiced ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-600'"></div>
                      <span [title]="p.isInvoiced ? 'Factura: ' + p.invoiceNumber : 'Factura pendiente'"
                            [class]="p.isInvoiced ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-600 text-slate-400'"
                            class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold">2</span>
                      <div class="w-4 h-px" [class]="p.isReconciled ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-600'"></div>
                      <span [title]="p.isReconciled ? 'Conciliado' : 'Conciliación pendiente'"
                            [class]="p.isReconciled ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600 text-slate-400'"
                            class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                    </div>
                  </td>
                  <!-- Acciones contextuales según estado del ciclo -->
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      @if (!p.isInvoiced) {
                        <a [routerLink]="['/inventory/purchases', p.id, 'invoice']"
                           class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
                          Registrar Factura
                        </a>
                      } @else if (!p.isReconciled) {
                        <span class="text-xs text-green-600 dark:text-green-400 mr-1">✓ Facturada</span>
                        <a [routerLink]="['/inventory/purchases', p.id, 'reconcile']"
                           class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap">
                          Conciliar
                        </a>
                      } @else {
                        <span class="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Completo
                        </span>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay recepciones registradas.
                    <a routerLink="/inventory/entry/new" class="text-blue-600 hover:underline ml-1">Crear una nueva</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class PurchasesListComponent implements OnInit {
  private purchasesService = inject(PurchasesService);

  purchases = signal<any[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.load();
  }

  async load() {
    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(this.purchasesService.getPurchases());
      this.purchases.set(Array.isArray(data) ? data : []);
    } catch {
      this.purchases.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  getTotal(p: any): number {
    if (!p?.products) return 0;
    return p.products.reduce((s: number, pp: any) => s + Number(pp.totalPrice ?? 0), 0);
  }
}
