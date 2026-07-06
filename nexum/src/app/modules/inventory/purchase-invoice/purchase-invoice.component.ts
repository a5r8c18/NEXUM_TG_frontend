import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PurchasesService } from '../../../core/services/purchases.service';

@Component({
  selector: 'app-purchase-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/inventory/purchase-orders" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </a>
        <div>
          <h1 class="text-xl font-bold dark:text-white">Registrar Factura del Proveedor</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Paso 2: Registro de factura — Crea la Cuenta por Pagar</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      } @else if (purchase()) {

        <!-- Info de la compra -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="text-sm font-semibold text-blue-800 dark:text-blue-300">Recepción de mercancía registrada</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
            <span><span class="font-medium">Documento:</span> {{ purchase()?.document }}</span>
            <span><span class="font-medium">Proveedor:</span> {{ purchase()?.supplier }}</span>
            <span><span class="font-medium">Almacén:</span> {{ purchase()?.warehouse }}</span>
            <span><span class="font-medium">Total:</span> {{ getTotal() | number:'1.2-2' }} CUP</span>
          </div>
          <div class="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 rounded px-2 py-1">
            Asiento pendiente: <strong>189-01 Mercancías en Tránsito</strong> — Al registrar la factura se liquidará y creará la CxP en cuenta <strong>410</strong>
          </div>
        </div>

        @if (purchase()?.isInvoiced) {
          <!-- Ya facturada -->
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
            <svg class="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="font-semibold text-green-800 dark:text-green-300">Esta compra ya tiene factura registrada</p>
            <p class="text-sm text-green-600 dark:text-green-400 mt-1">Factura: <strong>{{ purchase()?.invoiceNumber }}</strong></p>
            <a routerLink="/inventory/purchase-orders" class="mt-4 inline-block text-sm text-blue-600 hover:underline">Volver a la lista</a>
          </div>
        } @else {
          <!-- Formulario -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 class="text-base font-semibold text-slate-800 dark:text-white mb-4">Datos de la Factura</h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número de Factura <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="invoiceNumber"
                  placeholder="FAC-2024-0089"
                  class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Factura <span class="text-red-500">*</span></label>
                <input
                  type="date"
                  [(ngModel)]="invoiceDate"
                  class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <!-- Resumen del asiento que se generará -->
            <div class="mt-5 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Asiento contable que se generará</p>
              <div class="space-y-1 text-sm font-mono">
                <div class="flex justify-between">
                  <span class="text-slate-600 dark:text-slate-400">Débito  189-01 Mcías en Tránsito</span>
                  <span class="font-medium dark:text-white">{{ getTotal() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-600 dark:text-slate-400">Crédito 410    Proveedores (CxP)</span>
                  <span class="font-medium dark:text-white">{{ getTotal() | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            @if (errorMsg()) {
              <div class="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {{ errorMsg() }}
              </div>
            }

            <div class="flex gap-3 mt-6">
              <a routerLink="/inventory/purchase-orders" class="flex-1 text-center border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </a>
              <button
                (click)="submit()"
                [disabled]="isSaving() || !invoiceNumber || !invoiceDate"
                class="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                @if (isSaving()) {
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                }
                Registrar Factura y Crear CxP
              </button>
            </div>
          </div>
        }
      } @else {
        <div class="text-center py-12 text-slate-500 dark:text-slate-400">Compra no encontrada</div>
      }

      @if (successMsg()) {
        <div class="fixed bottom-6 right-6 bg-green-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-2 z-50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          {{ successMsg() }}
        </div>
      }
    </div>
  `,
})
export class PurchaseInvoiceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchasesService = inject(PurchasesService);

  purchase = signal<any>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  invoiceNumber = '';
  invoiceDate = new Date().toISOString().split('T')[0];

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

  getTotal(): number {
    const p = this.purchase();
    if (!p?.products) return 0;
    return p.products.reduce((s: number, pp: any) => s + Number(pp.totalPrice ?? 0), 0);
  }

  async submit() {
    if (!this.invoiceNumber || !this.invoiceDate) return;
    this.isSaving.set(true);
    this.errorMsg.set('');
    try {
      const id = this.route.snapshot.paramMap.get('id')!;
      await firstValueFrom(
        this.purchasesService.registerSupplierInvoice(id, {
          invoiceNumber: this.invoiceNumber,
          invoiceDate: this.invoiceDate,
        }),
      );
      this.successMsg.set('Factura registrada. CxP creada correctamente.');
      setTimeout(() => this.router.navigate(['/inventory/purchase-orders']), 2000);
    } catch (err: any) {
      this.errorMsg.set(err?.error?.message ?? 'Error al registrar la factura');
    } finally {
      this.isSaving.set(false);
    }
  }
}
