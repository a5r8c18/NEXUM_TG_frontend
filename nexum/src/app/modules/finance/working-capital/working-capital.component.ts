import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WorkingCapitalService, WorkingCapitalReport } from '../../../core/services/working-capital.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-working-capital',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold dark:text-white">Capital de Trabajo</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Análisis de tensión de caja — Inventario + CxC + CxP</p>
        </div>
        <div class="flex items-center gap-3">
          <select [(ngModel)]="period" (ngModelChange)="loadData()"
                  class="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 dark:text-white text-sm">
            <option [value]="30">30 días</option>
            <option [value]="60">60 días</option>
            <option [value]="90">90 días</option>
            <option [value]="180">180 días</option>
            <option [value]="365">365 días</option>
          </select>
          <button (click)="loadData()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-slate-500">
            <svg class="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span class="text-sm">Calculando indicadores...</span>
          </div>
        </div>
      } @else if (report()) {

        <!-- Tensión de Caja — Banner principal -->
        <div [class]="tensionClass()" class="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div [class]="tensionIconClass()" class="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (report()!.cashTension.level === 'low') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                } @else if (report()!.cashTension.level === 'critical') {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"/>
                }
              </svg>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide opacity-75">Tensión de Caja</p>
              <p class="text-2xl font-bold">{{ tensionLabel() }}</p>
              <p class="text-sm opacity-80 mt-0.5">{{ report()!.cashTension.description }}</p>
            </div>
          </div>
          <!-- Score gauge -->
          <div class="flex flex-col items-center">
            <div class="relative w-20 h-20">
              <svg class="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="white" stroke-width="3"
                        [attr.stroke-dasharray]="scoreCircle()" stroke-dashoffset="0"/>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-xl font-bold text-white">{{ report()!.cashTension.score }}</span>
              </div>
            </div>
            <p class="text-xs text-white/70 mt-1">Score / 100</p>
          </div>
        </div>

        <!-- KPIs principales: CCC / DSO / DPO / DIO -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Ciclo Conv. Caja</p>
            <p class="text-3xl font-bold mt-1 dark:text-white">{{ report()!.indicators.cashConversionCycle | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-400 mt-1">días (DIO + DSO − DPO)</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">DSO — Cobros</p>
            <p class="text-3xl font-bold mt-1 dark:text-white">{{ report()!.indicators.daysSalesOutstanding | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-400 mt-1">días promedio cobro</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">DPO — Pagos</p>
            <p class="text-3xl font-bold mt-1 dark:text-white">{{ report()!.indicators.daysPayableOutstanding | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-400 mt-1">días promedio pago</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">DIO — Inventario</p>
            <p class="text-3xl font-bold mt-1 dark:text-white">{{ report()!.indicators.daysInventoryOutstanding | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-400 mt-1">días stock disponible</p>
          </div>
        </div>

        <!-- Panel central: CxC | Inventario | CxP -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          <!-- CxC -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="bg-green-500 px-5 py-3 flex items-center justify-between">
              <span class="text-white font-semibold text-sm">Cuentas por Cobrar</span>
              <a routerLink="/finance/receivables" class="text-white/80 hover:text-white text-xs underline">Ver CxC →</a>
            </div>
            <div class="p-5 space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Total pendiente</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ report()!.cxc.totalPending | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Vencido</span>
                <span [class]="report()!.cxc.totalOverdue > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400'"
                      class="text-sm">{{ report()!.cxc.totalOverdue | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Facturas</span>
                <span class="text-sm dark:text-slate-300">{{ report()!.cxc.count }} ({{ report()!.cxc.overdueCount }} vencidas)</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Días promedio</span>
                <span class="text-sm dark:text-slate-300">{{ report()!.cxc.averageDaysOutstanding }} días</span>
              </div>
              <!-- Aging mini-bar -->
              <div class="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p class="text-xs text-slate-400 mb-2">Antigüedad</p>
                <div class="space-y-1 text-xs">
                  @for (bucket of agingKeys; track bucket) {
                    <div class="flex items-center gap-2">
                      <span class="w-14 text-slate-500 dark:text-slate-400 flex-shrink-0">{{ bucket }}</span>
                      <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div class="bg-green-500 h-2 rounded-full" [style.width]="agingBarWidth(report()!.cxc.agingBuckets, bucket)"></div>
                      </div>
                      <span class="text-slate-600 dark:text-slate-300 w-20 text-right">{{ agingValue(report()!.cxc.agingBuckets, bucket) | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Inventario -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="bg-blue-500 px-5 py-3 flex items-center justify-between">
              <span class="text-white font-semibold text-sm">Inventario</span>
              <a routerLink="/inventory/analytics" class="text-white/80 hover:text-white text-xs underline">Ver analytics →</a>
            </div>
            <div class="p-5 space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Valor total</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ report()!.inventory.totalValue | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Stock lento (>90d)</span>
                <span [class]="report()!.inventory.slowMovingValue > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400'"
                      class="text-sm">{{ report()!.inventory.slowMovingValue | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Stock rápido (&lt;30d)</span>
                <span class="text-sm text-green-600 dark:text-green-400 font-semibold">{{ report()!.inventory.fastMovingValue | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Productos</span>
                <span class="text-sm dark:text-slate-300">{{ report()!.inventory.totalProducts }} ({{ report()!.inventory.slowMovingCount }} lentos)</span>
              </div>
              <!-- Barra slow/fast -->
              <div class="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p class="text-xs text-slate-400 mb-2">Distribución del valor</p>
                <div class="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div class="bg-green-400 h-full" [style.width]="fastPct() + '%'"></div>
                  <div class="bg-amber-400 h-full" [style.width]="slowPct() + '%'"></div>
                  <div class="bg-slate-300 dark:bg-slate-600 h-full flex-1"></div>
                </div>
                <div class="flex gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span class="flex items-center gap-1"><span class="w-2 h-2 bg-green-400 rounded-full inline-block"></span>Rápido</span>
                  <span class="flex items-center gap-1"><span class="w-2 h-2 bg-amber-400 rounded-full inline-block"></span>Lento</span>
                  <span class="flex items-center gap-1"><span class="w-2 h-2 bg-slate-300 rounded-full inline-block"></span>Normal</span>
                </div>
              </div>
            </div>
          </div>

          <!-- CxP -->
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="bg-red-500 px-5 py-3 flex items-center justify-between">
              <span class="text-white font-semibold text-sm">Cuentas por Pagar</span>
              <a routerLink="/finance/payables" class="text-white/80 hover:text-white text-xs underline">Ver CxP →</a>
            </div>
            <div class="p-5 space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Total pendiente</span>
                <span class="font-bold text-slate-900 dark:text-white">{{ report()!.cxp.totalPending | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Vencido</span>
                <span [class]="report()!.cxp.totalOverdue > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400'"
                      class="text-sm">{{ report()!.cxp.totalOverdue | number:'1.2-2' }} CUP</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Facturas</span>
                <span class="text-sm dark:text-slate-300">{{ report()!.cxp.count }} ({{ report()!.cxp.overdueCount }} vencidas)</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-slate-600 dark:text-slate-400">Días promedio</span>
                <span class="text-sm dark:text-slate-300">{{ report()!.cxp.averageDaysOutstanding }} días</span>
              </div>
              <!-- Aging mini-bar -->
              <div class="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p class="text-xs text-slate-400 mb-2">Antigüedad</p>
                <div class="space-y-1 text-xs">
                  @for (bucket of agingKeys; track bucket) {
                    <div class="flex items-center gap-2">
                      <span class="w-14 text-slate-500 dark:text-slate-400 flex-shrink-0">{{ bucket }}</span>
                      <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div class="bg-red-500 h-2 rounded-full" [style.width]="agingBarWidth(report()!.cxp.agingBuckets, bucket)"></div>
                      </div>
                      <span class="text-slate-600 dark:text-slate-300 w-20 text-right">{{ agingValue(report()!.cxp.agingBuckets, bucket) | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Balance y ratio -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Balance Capital de Trabajo</p>
            <p class="text-3xl font-bold mt-1"
               [class]="report()!.indicators.workingCapitalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ report()!.indicators.workingCapitalBalance | number:'1.2-2' }} CUP
            </p>
            <p class="text-xs text-slate-400 mt-1">CxC + Inventario − CxP</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">Ratio Liquidez CxC/CxP</p>
            <p class="text-3xl font-bold mt-1"
               [class]="report()!.indicators.liquidityRatio >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ report()!.indicators.liquidityRatio | number:'1.2-2' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">
              @if (report()!.indicators.liquidityRatio >= 1) { Se cobra más de lo que se paga }
              @else { Se paga más de lo que se cobra ⚠️ }
            </p>
          </div>
        </div>

        <!-- Factores y Recomendaciones -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          @if (report()!.tensionFactors.length > 0) {
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 class="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
                Factores de Tensión
              </h3>
              <ul class="space-y-2">
                @for (factor of report()!.tensionFactors; track factor) {
                  <li class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span class="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    {{ factor }}
                  </li>
                }
              </ul>
            </div>
          }

          <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h3 class="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Recomendaciones
            </h3>
            <ul class="space-y-2">
              @for (rec of report()!.recommendations; track rec) {
                <li class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  {{ rec }}
                </li>
              }
            </ul>
          </div>
        </div>

        <!-- Generado -->
        <p class="text-xs text-slate-400 dark:text-slate-500 text-right mt-4">
          Generado: {{ report()!.generatedAt | date:'dd/MM/yyyy HH:mm' }} · Período análisis: {{ report()!.period }} días
        </p>

      } @else if (hasError()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <svg class="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-slate-500 dark:text-slate-400">No se pudo cargar el reporte</p>
          <button (click)="loadData()" class="mt-3 text-blue-600 hover:underline text-sm">Reintentar</button>
        </div>
      }
    </div>
  `,
})
export class WorkingCapitalComponent implements OnInit {
  private service = inject(WorkingCapitalService);

  report = signal<WorkingCapitalReport | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  period = 90;

  readonly agingKeys = ['current', '1-30', '31-60', '61-90', 'over-90'];

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const data = await firstValueFrom(this.service.getReport(this.period));
      this.report.set(data);
    } catch {
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  tensionClass(): string {
    const level = this.report()?.cashTension.level;
    const map: Record<string, string> = {
      low: 'bg-green-500 text-white',
      moderate: 'bg-amber-500 text-white',
      high: 'bg-orange-600 text-white',
      critical: 'bg-red-600 text-white',
    };
    return map[level ?? 'low'];
  }

  tensionIconClass(): string {
    const level = this.report()?.cashTension.level;
    const map: Record<string, string> = {
      low: 'bg-green-600',
      moderate: 'bg-amber-600',
      high: 'bg-orange-700',
      critical: 'bg-red-700',
    };
    return map[level ?? 'low'];
  }

  tensionLabel(): string {
    const map: Record<string, string> = {
      low: 'Saludable',
      moderate: 'Moderada',
      high: 'Alta',
      critical: 'Crítica',
    };
    return map[this.report()?.cashTension.level ?? 'low'];
  }

  scoreCircle(): string {
    const score = this.report()?.cashTension.score ?? 0;
    const circumference = 100;
    const filled = (score / 100) * circumference;
    return `${filled} ${circumference - filled}`;
  }

  agingValue(buckets: any, key: string): number {
    return (buckets as Record<string, number>)[key] ?? 0;
  }

  agingBarWidth(buckets: any, key: string): string {
    const rec = buckets as Record<string, number>;
    const total = Object.values(rec).reduce((s, v) => s + v, 0);
    if (total === 0) return '0%';
    return Math.round(((rec[key] ?? 0) / total) * 100) + '%';
  }

  fastPct(): number {
    const inv = this.report()?.inventory;
    if (!inv || inv.totalValue === 0) return 0;
    return Math.round((inv.fastMovingValue / inv.totalValue) * 100);
  }

  slowPct(): number {
    const inv = this.report()?.inventory;
    if (!inv || inv.totalValue === 0) return 0;
    return Math.round((inv.slowMovingValue / inv.totalValue) * 100);
  }
}
