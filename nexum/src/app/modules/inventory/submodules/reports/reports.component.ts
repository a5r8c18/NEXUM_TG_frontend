import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReportsService } from '../../../../core/services/reports.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportFilters, ReceptionReport, DeliveryReport } from '../../../../models/report.models';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

type Report = ReceptionReport | DeliveryReport;

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, ModalComponent],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit, OnDestroy {
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);

  reports = signal<Report[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // UI state
  activeTab = signal<'reception' | 'delivery'>('reception');
  selectedReport = signal<Report | null>(null);
  currentPage = signal(1);
  pageSize = 10;

  // Filters
  filters = signal<ReportFilters>({});
  searchTerm = signal('');
  fromDate = signal('');
  toDate = signal('');

  private refreshSub!: Subscription;
  private toastSub!: Subscription;

  ngOnInit(): void {
    this.loadReports();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadReports());
    this.toastSub = this.notificationService.toasts$.subscribe(t => {
      this.toast.set(t);
      setTimeout(() => this.toast.set(null), 4000);
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  loadReports(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    const serviceCall = this.activeTab() === 'reception'
      ? this.reportsService.getReceptionReports(this.filters())
      : this.reportsService.getDeliveryReports(this.filters());

    serviceCall.subscribe({
      next: (data) => {
        this.reports.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
        this.showToast('Error al cargar los reportes', 'error');
      }
    });
  }

  applyFilters(): void {
    const newFilters: ReportFilters = {
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      product: this.searchTerm() || undefined,
    };
    this.filters.set(newFilters);
    this.loadReports();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.filters.set({});
    this.loadReports();
  }

  get filteredReports(): Report[] {
    const search = this.searchTerm().toLowerCase();
    const base = this.reports();
    if (!search) return base;
    return base.filter(r =>
      (r as any).document?.toLowerCase().includes(search) ||
      (r as any).supplier?.toLowerCase().includes(search) ||
      (r as any).details?.products?.some((p: any) =>
        p.description?.toLowerCase().includes(search) ||
        p.code?.toLowerCase().includes(search)
      )
    );
  }

  get pagedReports(): Report[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredReports.slice(start, start + this.pageSize);
  }

  get paginationConfig(): PaginationConfig {
    const total = this.filteredReports.length;
    return {
      currentPage: this.currentPage(),
      totalPages: Math.ceil(total / this.pageSize),
      totalItems: total,
      itemsPerPage: this.pageSize,
    };
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  switchTab(tab: 'reception' | 'delivery'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.clearFilters();
  }

  openDetails(report: Report): void {
    this.selectedReport.set(report);
  }

  closeDetails(): void {
    this.selectedReport.set(null);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // Helper getters for template safety
  get r() { return this.pagedReports; }
  get sr() { return this.selectedReport(); }

  isReception(report: Report): report is ReceptionReport {
    return 'supplier' in report;
  }

  hasExpirationDate(product: any): product is { expirationDate?: string } {
    return 'expirationDate' in product;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
