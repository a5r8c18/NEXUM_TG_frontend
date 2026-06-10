import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, PaginationComponent, ModalComponent],
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

  exportToExcel(report: Report): void {
    const products = (report as any).details?.products || [];
    const type = this.isReception(report) ? 'Recepción' : 'Entrega';
    const header = [`Informe de ${type}`, `Documento: ${report.document || '-'}`, `Entidad: ${report.entity || '-'}`, `Almacén: ${report.warehouse || '-'}`, ''];
    const colHeaders = ['Código', 'Descripción', 'Unidad', 'Cantidad', 'P. Unitario', 'Importe'];
    const rows = products.map((p: any) => [p.code, p.description, p.unit, p.quantity, p.unitPrice, p.amount]);
    const total = ['', '', '', '', 'TOTAL:', (report as any).details?.totalAmount || 0];

    let csv = header.join('\n') + '\n' + colHeaders.join(',') + '\n';
    rows.forEach((row: any[]) => { csv += row.join(',') + '\n'; });
    csv += total.join(',') + '\n';

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe_${type.toLowerCase()}_${report.document || 'sin_doc'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Exportado a Excel correctamente', 'success');
  }

  exportToPdf(report: Report): void {
    const products = (report as any).details?.products || [];
    const type = this.isReception(report) ? 'Recepción' : 'Entrega';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('No se pudo abrir la ventana de impresión', 'error');
      return;
    }

    const productsHtml = products.map((p: any) =>
      `<tr><td>${p.code}</td><td>${p.description}</td><td>${p.unit}</td><td style="text-align:right">${p.quantity}</td><td style="text-align:right">$${Number(p.unitPrice).toFixed(2)}</td><td style="text-align:right">$${Number(p.amount).toFixed(2)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><title>Informe de ${type}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 20px; }
        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .info span { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; }
        th { background: #f0f0f0; text-align: left; }
        .conformidad { border: 1px solid #ccc; padding: 12px; margin-bottom: 16px; }
        .section { border: 1px solid #ccc; padding: 12px; margin-bottom: 16px; }
        .section h4 { margin: 0 0 8px 0; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
        .firma-line { border-bottom: 1px solid #333; width: 150px; margin-top: 40px; text-align: center; font-size: 10px; padding-top: 4px; }
      </style>
    </head><body>
      <h2>Informe de ${type}</h2>
      <p class="subtitle">Generado el ${new Date().toLocaleDateString('es-ES')}</p>
      <div class="info">
        <div><span>Documento:</span> ${report.document || '-'}</div>
        <div><span>Entidad:</span> ${report.entity || '-'}</div>
        <div><span>Almacén:</span> ${report.warehouse || '-'}</div>
        ${this.isReception(report) ? `<div><span>Proveedor:</span> ${report.supplier || '-'}</div>` : ''}
        <div><span>Fecha:</span> ${(report as any).created_at ? this.formatDate((report as any).created_at) : '-'}</div>
        <div><span>Total:</span> $${((report as any).details?.totalAmount || 0).toFixed(2)}</div>
      </div>
      <table>
        <thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th style="text-align:right">Cantidad</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Importe</th></tr></thead>
        <tbody>${productsHtml}</tbody>
        <tfoot><tr><td colspan="5" style="text-align:right;font-weight:bold">TOTAL:</td><td style="text-align:right;font-weight:bold">$${((report as any).details?.totalAmount || 0).toFixed(2)}</td></tr></tfoot>
      </table>
      ${this.isReception(report) ? `
        <div class="conformidad">
          <strong>Estado de Conformidad</strong><br/>
          Los materiales recibidos <strong>SÍ</strong> corresponden a la calidad, especificaciones, estado de conservación y cantidades que muestran los documentos del suministrador.
        </div>
        <div class="section">
          <h4>Transportista</h4>
          <div class="grid4">
            <div><strong>Nombre:</strong> ${(report as any).transportista?.nombre || '-'}</div>
            <div><strong>CI:</strong> ${(report as any).transportista?.ci || '-'}</div>
            <div><strong>Chapa:</strong> ${(report as any).transportista?.chapa || '-'}</div>
            <div><strong>Firma:</strong> _____________</div>
          </div>
        </div>
        <div class="section">
          <h4>Responsables</h4>
          <div class="grid2">
            <div><strong>Jefe de Almacén:</strong> ${(report as any).responsables?.jefeAlmacen || '-'}</div>
            <div><strong>Recepcionado por:</strong> ${(report as any).responsables?.recepcionadoPor || (report as any).receivedBy || '-'}</div>
            <div><strong>Anotado por:</strong> ${(report as any).responsables?.anotadoPor || '-'}</div>
            <div><strong>Contabilizado por:</strong> ${(report as any).responsables?.contabilizadoPor || '-'}</div>
          </div>
        </div>
      ` : ''}
      <script>window.onload = function() { window.print(); }</script>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    this.showToast('PDF generado correctamente', 'success');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
