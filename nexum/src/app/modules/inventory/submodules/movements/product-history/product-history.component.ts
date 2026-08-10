import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MovementsService } from '../../../../../core/services/movements.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ProductHistory, ProductHistoryRow } from '../../../../../models/inventory.models';

@Component({
  selector: 'app-product-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-history.component.html',
})
export class ProductHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private movementsService = inject(MovementsService);
  private authService = inject(AuthService);

  history = signal<ProductHistory | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  productCode = '';
  warehouseId = '';

  ngOnInit(): void {
    this.productCode = this.route.snapshot.paramMap.get('productCode') || '';
    this.warehouseId = this.route.snapshot.queryParamMap.get('warehouse') || '';

    if (!this.productCode) {
      this.error.set('Producto no especificado');
      return;
    }
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const companyId = this.authService.getCurrentCompanyId();

    this.movementsService
      .getProductHistory(this.productCode, { warehouse: this.warehouseId || undefined }, companyId)
      .subscribe({
        next: (data) => {
          this.history.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar el historial del producto');
          this.isLoading.set(false);
        },
      });
  }

  get rows(): ProductHistoryRow[] {
    return this.history()?.movements ?? [];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null) return '-';
    return '$' + Number(amount).toLocaleString('es-CU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  translateType(type: string): string {
    const map: Record<string, string> = {
      entry: 'Entrada',
      exit: 'Salida',
      return: 'Devolución',
      transfer: 'Transferencia',
    };
    return map[type] ?? type;
  }

  typeClass(type: string): string {
    switch (type) {
      case 'entry': return 'bg-green-50 text-green-700 border-green-200';
      case 'exit': return 'bg-red-50 text-red-700 border-red-200';
      case 'transfer': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'return': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  /** Navega al informe asociado al movimiento (recepción, vale de entrega o transferencia). */
  openReport(row: ProductHistoryRow): void {
    this.router.navigate(['/inventory/reports'], {
      queryParams: { tab: row.reportType, number: row.reportNumber, movement: row.id },
    });
  }

  goBack(): void {
    this.router.navigate(['/inventory']);
  }
}
