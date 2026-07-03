import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryAnalyticsService } from '../../../core/services/inventory-analytics.service';
import { WarehouseService } from '../../../core/services/warehouse.service';

@Component({
  selector: 'app-inventory-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './analytics.component.html',
})
export class InventoryAnalyticsComponent implements OnInit {
  private analyticsService = inject(InventoryAnalyticsService);
  private warehouseService = inject(WarehouseService);

  rotationData = signal<any>(null);
  slowMovingData = signal<any[]>([]);
  warehouses = signal<any[]>([]);
  isLoadingRotation = signal(false);
  isLoadingSlow = signal(false);
  hasError = signal(false);

  warehouseFilter = signal('');
  categoryFilter = signal('');
  periodFilter = signal('90');

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadAll();
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (data: any) => this.warehouses.set(Array.isArray(data) ? data : (data?.data ?? [])),
      error: () => this.warehouses.set([]),
    });
  }

  loadAll(): void {
    this.loadRotation();
    this.loadSlowMoving();
  }

  loadRotation(): void {
    this.isLoadingRotation.set(true);
    this.hasError.set(false);
    this.analyticsService.getRotationAnalytics({
      warehouseId: this.warehouseFilter() || undefined,
      category: this.categoryFilter() || undefined,
      period: this.periodFilter() ? Number(this.periodFilter()) : undefined,
    }).subscribe({
      next: (data: any) => {
        // Map backend response to frontend expected structure
        this.rotationData.set({
          averageRotation: data.summary?.totalExits > 0 && data.summary?.totalStock > 0 
            ? (data.summary.totalExits / data.summary.totalStock) * (365 / (data.period || 365))
            : 0,
          averageDaysInventory: data.summary?.averageDaysOfInventory || 0,
          abcAnalysis: data.summary?.abcDistribution || { A: 0, B: 0, C: 0 },
          byProduct: data.analytics?.map((item: any) => ({
            productCode: item.productCode,
            productName: item.productName,
            rotation: item.rotationRate,
            daysInventory: item.daysOfInventory,
            abcClass: item.abcClass,
          })) || [],
        });
        this.isLoadingRotation.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoadingRotation.set(false);
      },
    });
  }

  loadSlowMoving(): void {
    this.isLoadingSlow.set(true);
    this.analyticsService.getSlowMoving({
      warehouseId: this.warehouseFilter() || undefined,
      category: this.categoryFilter() || undefined,
    }).subscribe({
      next: (data: any) => {
        // Map backend response to frontend expected structure
        const slowMovingItems = data.slowMovingItems?.map((item: any) => ({
          productCode: item.productCode,
          productName: item.productName,
          stock: item.currentStock,
          totalValue: item.inventoryValue,
          daysSinceLastMove: item.daysOfInventory,
        })) || [];
        this.slowMovingData.set(slowMovingItems);
        this.isLoadingSlow.set(false);
      },
      error: () => {
        this.slowMovingData.set([]);
        this.isLoadingSlow.set(false);
      },
    });
  }

  onWarehouseChange(event: Event): void {
    this.warehouseFilter.set((event.target as HTMLSelectElement).value);
    this.loadAll();
  }

  onCategoryChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
    this.loadAll();
  }

  onPeriodChange(event: Event): void {
    this.periodFilter.set((event.target as HTMLSelectElement).value);
    this.loadRotation();
  }

  getAbcClass(cls: string): string {
    const map: Record<string, string> = {
      A: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      B: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      C: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return map[cls] || 'bg-slate-100 text-slate-800';
  }
}
