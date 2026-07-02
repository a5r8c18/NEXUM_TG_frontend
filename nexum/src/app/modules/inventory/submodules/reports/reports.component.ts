import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportsService } from '../../../../core/services/reports.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportFilters, ReceptionReport, DeliveryReport, TransferReport } from '../../../../models/report.models';
import { PaginationComponent, PaginationConfig } from '../../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

type Report = ReceptionReport | DeliveryReport | TransferReport;

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
  activeTab = signal<'reception' | 'delivery' | 'transfer'>('reception');
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
    const tab = this.activeTab();
    const f = this.filters();
    const serviceCall = tab === 'reception'
      ? this.reportsService.getReceptionReports(f)
      : tab === 'delivery'
        ? this.reportsService.getDeliveryReports(f)
        : this.reportsService.getTransferReports({
            fromDate: f.fromDate,
            toDate: f.toDate,
            product: f.product,
          });

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

  switchTab(tab: 'reception' | 'delivery' | 'transfer'): void {
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

  isTransfer(report: Report): report is TransferReport {
    return 'sourceWarehouse' in report;
  }

  hasExpirationDate(product: any): product is { expirationDate?: string } {
    return 'expirationDate' in product;
  }

  exportToExcel(report: Report): void {
    const products = (report as any).details?.products || [];
    let type: string;
    let header: string[];
    if (this.isTransfer(report)) {
      type = 'Traslado';
      header = [`SC-2-22 Comprobante de Traslado`, `Almacén Origen: ${report.sourceWarehouse || '-'}`, `Almacén Destino: ${report.destinationWarehouse || '-'}`, `Motivo: ${report.reason || '-'}`, ''];
    } else {
      type = this.isReception(report) ? 'Recepción' : 'Entrega';
      header = [`Informe de ${type}`, `Documento: ${(report as any).document || '-'}`, `Entidad: ${(report as any).entity || '-'}`, `Almacén: ${(report as any).warehouse || '-'}`, ''];
    }
    const colHeaders = ['Código', 'Descripción', 'Unidad', 'Cantidad', 'P. Unitario', 'Importe'];
    const rows = products.map((p: any) => [p.code, p.description, p.unit, p.quantity, p.unitPrice, p.amount]);
    const total = ['', '', '', '', 'TOTAL:', (report as any).details?.totalAmount || 0];

    let csv = header.join('\n') + '\n' + colHeaders.join(',') + '\n';
    rows.forEach((row: any[]) => { csv += row.join(',') + '\n'; });
    csv += total.join(',') + '\n';

    const docId = this.isTransfer(report) ? report.id.substring(0, 8) : ((report as any).document || 'sin_doc');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sc_2_22_traslado_${docId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('Exportado a Excel correctamente', 'success');
  }

  exportToPdf(report: Report): void {
    const products = (report as any).details?.products || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('No se pudo abrir la ventana de impresión', 'error');
      return;
    }

    let html: string;

    if (this.isTransfer(report)) {
      // SC-2-22 Comprobante de Traslado
      const productsHtml = products.map((p: any) =>
        `<tr>
          <td>${p.code}</td>
          <td>${p.description}</td>
          <td>${p.unit || '-'}</td>
          <td style="text-align:center">${p.quantity}</td>
          <td style="text-align:right">$${Number(p.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">$${Number(p.amount).toFixed(2)}</td>
        </tr>`
      ).join('');

      const categoryLabel: Record<string, string> = {
        insumo: 'Insumo', mercancia: 'Mercancía', produccion: 'Producción'
      };

      html = `<!DOCTYPE html><html><head><title>SC-2-22 Comprobante de Traslado</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; margin: 0; }
          h1 { text-align: center; font-size: 14px; margin: 0 0 5px 0; font-weight: bold; }
          h2 { text-align: center; font-size: 12px; margin: 0 0 15px 0; font-weight: normal; }
          .header-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .header-row { display: flex; justify-content: space-between; margin-bottom: 8px; gap: 10px; }
          .header-field { flex: 1; }
          .header-label { font-weight: bold; }
          .header-value { margin-left: 5px; }
          .arrow-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
          .arrow-box { flex: 1; border: 2px solid #333; padding: 8px 12px; border-radius: 4px; text-align: center; }
          .arrow-box .label { font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; }
          .arrow-box .value { font-size: 13px; font-weight: bold; margin-top: 2px; }
          .arrow-symbol { font-size: 20px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; }
          th { background: #f0f0f0; text-align: center; font-weight: bold; }
          .total-row td { font-weight: bold; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid #000; width: 100%; margin-top: 40px; padding-bottom: 5px; }
          .signature-label { font-size: 9px; margin-top: 5px; }
          .copies { margin-top: 20px; font-size: 9px; color: #666; }
          .cod-badge { display:inline-block; background:#e8f4ff; border:1px solid #aac; padding:2px 6px; border-radius:3px; font-size:9px; }
        </style>
      </head><body>
        <h1>SC-2-22 COMPROBANTE DE TRASLADO</h1>
        <h2>Modelo Oficial Cubano — ${categoryLabel[report.category || ''] || 'Inventario'}</h2>

        <!-- Encabezado -->
        <div class="header-box">
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">N° Comprobante:</span>
              <span class="header-value">${report.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Fecha:</span>
              <span class="header-value">${report.created_at ? this.formatDate(report.created_at) : '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Código movimiento:</span>
              <span class="header-value"><span class="cod-badge">${report.movementCode || '-'}</span> ${report.movementDescription || ''}</span>
            </div>
          </div>
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Motivo del traslado:</span>
              <span class="header-value">${report.reason || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Emitido por:</span>
              <span class="header-value">${report.userName || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Almacenes: Origen → Destino -->
        <div class="arrow-row">
          <div class="arrow-box">
            <div class="label">Almacén Origen (Entrega)</div>
            <div class="value">${report.sourceWarehouse || '-'}</div>
          </div>
          <div class="arrow-symbol">→</div>
          <div class="arrow-box">
            <div class="label">Almacén Destino (Recibe)</div>
            <div class="value">${report.destinationWarehouse || '-'}</div>
          </div>
        </div>

        <!-- Tabla de productos -->
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción del Artículo</th>
              <th>Unidad</th>
              <th>Cantidad Trasladada</th>
              <th>Precio Unitario</th>
              <th>Importe Total</th>
            </tr>
          </thead>
          <tbody>${productsHtml}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="5" style="text-align:right">TOTAL:</td>
              <td style="text-align:right">$${(report.details?.totalAmount || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Firmas y Responsables -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Jefe Almacén Origen<br/>(Entrega)</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Transportista / Mensajero<br/>(Traslada)</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Jefe Almacén Destino<br/>(Recibe)</div>
          </div>
        </div>

        <div class="copies">
          Original: Almacén Destino | Duplicado: Almacén Origen | Triplicado: Contabilidad
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body></html>`;
    } else if (this.isReception(report)) {
      // SC-2-04 Informe de Recepción
      const productsHtml = products.map((p: any) =>
        `<tr>
          <td>${p.code}</td>
          <td>${p.description}</td>
          <td>${p.unit || '-'}</td>
          <td style="text-align:center">-</td>
          <td style="text-align:center">${p.quantity}</td>
          <td style="text-align:right">$${Number(p.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">$${Number(p.amount).toFixed(2)}</td>
          <td>-</td>
        </tr>`
      ).join('');

      html = `<!DOCTYPE html><html><head><title>SC-2-04 Informe de Recepción</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; margin: 0; }
          h1 { text-align: center; font-size: 14px; margin: 0 0 5px 0; font-weight: bold; }
          h2 { text-align: center; font-size: 12px; margin: 0 0 15px 0; font-weight: normal; }
          .header-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .header-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .header-field { flex: 1; margin-right: 15px; }
          .header-field:last-child { margin-right: 0; }
          .header-label { font-weight: bold; }
          .header-value { margin-left: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; }
          th { background: #f0f0f0; text-align: center; font-weight: bold; }
          .section-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .section-title { font-weight: bold; margin-bottom: 8px; }
          .transport-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid #000; width: 100%; margin-top: 40px; padding-bottom: 5px; }
          .signature-label { font-size: 9px; margin-top: 5px; }
          .conformidad-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; background: #f9f9f9; }
          .total-row td { font-weight: bold; }
        </style>
      </head><body>
        <h1>SC-2-04 INFORME DE RECEPCIÓN</h1>
        <h2>Modelo Oficial Cubano</h2>

        <!-- Encabezado -->
        <div class="header-box">
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Número de Informe:</span>
              <span class="header-value">${(report as any).reportNumber || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Fecha de Emisión:</span>
              <span class="header-value">${(report as any).created_at ? this.formatDate((report as any).created_at) : '-'}</span>
            </div>
          </div>
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Entidad:</span>
              <span class="header-value">${report.entity || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Almacén Receptor:</span>
              <span class="header-value">${report.warehouse || '-'}</span>
            </div>
          </div>
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Proveedor:</span>
              <span class="header-value">${report.supplier || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Documento de Respaldo:</span>
              <span class="header-value">${report.document || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Tabla de productos -->
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Cant. Solicitada</th>
              <th>Cant. Recibida</th>
              <th>Precio Unitario</th>
              <th>Importe Total</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>${productsHtml}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="6" style="text-align:right">TOTAL:</td>
              <td style="text-align:right">$${((report as any).details?.totalAmount || 0).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- Estado de Conformidad -->
        <div class="conformidad-box">
          <div class="section-title">ESTADO DE CONFORMIDAD</div>
          <div>Los materiales recibidos <strong>SÍ</strong> corresponden a la calidad, especificaciones, estado de conservación y cantidades que muestran los documentos del suministrador.</div>
        </div>

        <!-- Datos del Transportista -->
        <div class="section-box">
          <div class="section-title">DATOS DEL TRANSPORTISTA</div>
          <div class="transport-grid">
            <div><strong>Nombre:</strong> ${(report as any).transportista?.nombre || '-'}</div>
            <div><strong>CI:</strong> ${(report as any).transportista?.ci || '-'}</div>
            <div><strong>Chapa:</strong> ${(report as any).transportista?.chapa || '-'}</div>
          </div>
        </div>

        <!-- Observaciones Generales -->
        <div class="section-box">
          <div class="section-title">OBSERVACIONES GENERALES</div>
          <div>${(report as any).notes || 'Sin observaciones'}</div>
        </div>

        <!-- Firmas y Responsables -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Recibió<br/>${(report as any).responsables?.recepcionadoPor || '-'}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Revisó<br/>${(report as any).responsables?.jefeAlmacen || '-'}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Autorizó<br/>${(report as any).responsables?.contabilizadoPor || '-'}</div>
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body></html>`;
    } else {
      // SC-2-08 Vale de Entrega o Devolución
      const productsHtml = products.map((p: any) =>
        `<tr>
          <td>${p.code}</td>
          <td>${p.description}</td>
          <td>${p.unit || '-'}</td>
          <td style="text-align:center">-</td>
          <td style="text-align:center">${p.quantity}</td>
          <td style="text-align:right">$${Number(p.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">$${Number(p.amount).toFixed(2)}</td>
        </tr>`
      ).join('');

      html = `<!DOCTYPE html><html><head><title>SC-2-08 Vale de Entrega</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; margin: 0; }
          h1 { text-align: center; font-size: 14px; margin: 0 0 5px 0; font-weight: bold; }
          h2 { text-align: center; font-size: 12px; margin: 0 0 15px 0; font-weight: normal; }
          .header-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .header-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .header-field { flex: 1; margin-right: 15px; }
          .header-field:last-child { margin-right: 0; }
          .header-label { font-weight: bold; }
          .header-value { margin-left: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; }
          th { background: #f0f0f0; text-align: center; font-weight: bold; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-top: 30px; }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid #000; width: 100%; margin-top: 40px; padding-bottom: 5px; }
          .signature-label { font-size: 9px; margin-top: 5px; }
          .total-row td { font-weight: bold; }
          .copies { margin-top: 20px; font-size: 9px; color: #666; }
        </style>
      </head><body>
        <h1>SC-2-08 VALE DE ENTREGA O DEVOLUCIÓN</h1>
        <h2>Modelo Oficial Cubano</h2>

        <!-- Encabezado -->
        <div class="header-box">
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Número de Vale:</span>
              <span class="header-value">${(report as any).reportNumber || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Fecha de Emisión:</span>
              <span class="header-value">${(report as any).created_at ? this.formatDate((report as any).created_at) : '-'}</span>
            </div>
          </div>
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Entidad:</span>
              <span class="header-value">${report.entity || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Almacén que Entrega:</span>
              <span class="header-value">${report.warehouse || '-'}</span>
            </div>
          </div>
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Área/Destino Solicitante:</span>
              <span class="header-value">${(report as any).reason || '-'}</span>
            </div>
            <div class="header-field">
              <span class="header-label">Motivo:</span>
              <span class="header-value">Entrega de materiales</span>
            </div>
          </div>
          <div class="header-row">
            <div class="header-field">
              <span class="header-label">Documento de Respaldo:</span>
              <span class="header-value">${report.document || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Tabla de productos -->
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre del Producto</th>
              <th>Unidad</th>
              <th>Cant. Solicitada</th>
              <th>Cant. Entregada</th>
              <th>Precio Unitario</th>
              <th>Importe Total</th>
            </tr>
          </thead>
          <tbody>${productsHtml}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="5" style="text-align:right">TOTAL:</td>
              <td style="text-align:right">$${((report as any).details?.totalAmount || 0).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <!-- Observaciones -->
        <div class="header-box">
          <div class="section-title">OBSERVACIONES</div>
          <div>${(report as any).notes || 'Sin observaciones'}</div>
        </div>

        <!-- Firmas y Responsables -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Solicita<br/>${(report as any).responsables?.recepcionadoPor || '-'}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Autoriza<br/>${(report as any).responsables?.jefeAlmacen || '-'}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Entrega<br/>${(report as any).responsables?.anotadoPor || '-'}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Recibe<br/>${(report as any).responsables?.contabilizadoPor || '-'}</div>
          </div>
        </div>

        <div class="copies">
          Original: Contabilidad | Duplicado: Almacén | Triplicado: Área Destinataria
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body></html>`;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    this.showToast('PDF generado correctamente', 'success');
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
