import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PurchasesService } from '../../../core/services/purchases.service';

@Component({
  selector: 'app-purchase-reconcile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/inventory/purchase-orders"
           class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-xl font-bold dark:text-white">Conciliación a Tres Vías</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Paso 3: Vincula Pedido + Albarán + Factura para habilitar el pago</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      } @else if (purchase()) {

        <!-- Estado de los 3 pasos -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p class="text-xs font-semibold text-green-700 dark:text-green-400">Recepción</p>
            <p class="text-xs text-green-600 dark:text-green-500 mt-1">{{ purchase()?.document }}</p>
          </div>

          <div [class]="purchase()?.isInvoiced
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'"
            class="rounded-xl p-4 text-center">
            <div [class]="purchase()?.isInvoiced ? 'bg-green-500' : 'bg-amber-500'"
                 class="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
              @if (purchase()?.isInvoiced) {
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              } @else {
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
                </svg>
              }
            </div>
            <p [class]="purchase()?.isInvoiced ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'"
               class="text-xs font-semibold">Factura</p>
            <p [class]="purchase()?.isInvoiced ? 'text-green-600 dark:text-green-500' : 'text-amber-600 dark:text-amber-500'"
               class="text-xs mt-1">
              {{ purchase()?.isInvoiced ? purchase()?.invoiceNumber : 'Pendiente' }}
            </p>
          </div>

          <div [class]="purchase()?.isReconciled
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600'"
            class="rounded-xl p-4 text-center">
            <div [class]="purchase()?.isReconciled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'"
                 class="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
              @if (purchase()?.isReconciled) {
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              } @else {
                <span class="text-white text-xs font-bold">3</span>
              }
            </div>
            <p [class]="purchase()?.isReconciled ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'"
               class="text-xs font-semibold">Conciliado</p>
            <p [class]="purchase()?.isReconciled ? 'text-green-600 dark:text-green-500' : 'text-slate-400 dark:text-slate-500'"
               class="text-xs mt-1">
              {{ purchase()?.isReconciled ? 'Aprobado' : 'Pendiente' }}
            </p>
          </div>
        </div>

        @if (!purchase()?.isInvoiced) {
          <!-- Bloqueo: primero hay que registrar factura -->
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
            <div class="flex items-center gap-3">
              <svg class="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-semibold text-amber-800 dark:text-amber-300">Primero registra la factura del proveedor</p>
                <p class="text-sm text-amber-700 dark:text-amber-400 mt-1">La conciliación requiere que los tres documentos estén disponibles.</p>
              </div>
            </div>
            <a [routerLink]="['/inventory/purchases', purchase()?.id, 'invoice']"
               class="mt-4 inline-flex items-center gap-2 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 transition-colors">
              Ir a registrar factura
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

        } @else if (purchase()?.isReconciled) {
          <!-- Ya conciliada -->
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
            <svg class="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="font-semibold text-green-800 dark:text-green-300">Compra conciliada correctamente</p>
            <p class="text-sm text-green-600 dark:text-green-400 mt-1">El pago ha sido habilitado en Tesorería.</p>
            <a routerLink="/inventory/purchase-orders"
               class="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline">Volver a la lista</a>
          </div>

        } @else {
          <!-- Formulario de conciliación -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-base font-semibold text-slate-800 dark:text-white mb-1">Documentos para conciliar</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-5">Vincula el pedido original y el albarán con la factura ya registrada.</p>

            <div class="space-y-4">
              <!-- Pedido (OC) -->
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Número de Pedido / Orden de Compra
                  <span class="text-slate-400 text-xs ml-1">(opcional)</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="purchaseOrderId"
                  placeholder="PO-2024-0023"
                  class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <!-- Albarán -->
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Número de Albarán / Nota de Entrega
                  <span class="text-slate-400 text-xs ml-1">(opcional)</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="deliveryNoteId"
                  placeholder="ALB-2024-0045"
                  class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <!-- Resumen de los 3 documentos -->
            <div class="mt-5 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Resumen de la conciliación</p>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span class="text-slate-600 dark:text-slate-300">
                    <strong>Recepción:</strong> {{ purchase()?.document }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span class="text-slate-600 dark:text-slate-300">
                    <strong>Factura:</strong> {{ purchase()?.invoiceNumber }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div [class]="purchaseOrderId ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'"
                       class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span class="text-slate-600 dark:text-slate-300">
                    <strong>Pedido:</strong> {{ purchaseOrderId || 'No especificado' }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div [class]="deliveryNoteId ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'"
                       class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span class="text-slate-600 dark:text-slate-300">
                    <strong>Albarán:</strong> {{ deliveryNoteId || 'No especificado' }}
                  </span>
                </div>
              </div>
            </div>

            @if (errorMsg()) {
              <div class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {{ errorMsg() }}
              </div>
            }

            <div class="flex gap-3 mt-6">
              <a routerLink="/inventory/purchase-orders"
                 class="flex-1 text-center border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </a>
              <button
                (click)="submit()"
                [disabled]="isSaving()"
                class="flex-1 bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                @if (isSaving()) {
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                }
                Conciliar y Habilitar Pago
              </button>
            </div>
          </div>
        }
      } @else {
        <div class="text-center py-12 text-slate-500 dark:text-slate-400">Compra no encontrada</div>
      }

      @if (successMsg()) {
        <div class="fixed bottom-6 right-6 bg-green-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-2 z-50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ successMsg() }}
        </div>
      }
    </div>
  `,
})
export class PurchaseReconcileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchasesService = inject(PurchasesService);

  purchase = signal<any>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  purchaseOrderId = '';
  deliveryNoteId = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadPurchase(id);
  }

  async loadPurchase(id: string) {
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.purchasesService.getPurchaseById(id));
      this.purchase.set(res.purchase ?? res);
    } catch {
      this.purchase.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  async submit() {
    this.isSaving.set(true);
    this.errorMsg.set('');
    try {
      const id = this.route.snapshot.paramMap.get('id')!;
      await firstValueFrom(
        this.purchasesService.reconcilePurchase(id, {
          purchaseOrderId: this.purchaseOrderId || undefined,
          deliveryNoteId: this.deliveryNoteId || undefined,
        }),
      );
      this.successMsg.set('Conciliación completada. Pago habilitado en Tesorería.');
      setTimeout(() => this.router.navigate(['/inventory/purchase-orders']), 2000);
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? 'Error al conciliar la compra');
    } finally {
      this.isSaving.set(false);
    }
  }
}
