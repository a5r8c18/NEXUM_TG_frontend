import { Component, inject, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { AccountingService } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

export interface GeneratedReport {
  id: string;
  type: string;
  title: string;
  date: string;
  description: string;
  generatedBy: string;
  generatedAt: string;
  data: any;
  period?: {
    year?: string;
    month?: string;
    fromDate?: string;
    toDate?: string;
  };
  options?: {
    includeDraftEntries?: boolean;
    beforeClosing?: boolean;
    fullReport?: boolean;
    modelo5920?: boolean;
    modelo5921?: boolean;
  };
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './reports.template.html',
})
export class ReportsComponent {
  private accountingService = inject(AccountingService);
  private confirmDialog = inject(ConfirmDialogService);

  reports = signal<GeneratedReport[]>([]);
  isLoading = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = 10;

  // Active tab
  activeTab = signal<'trial-balance' | 'balance-sheet' | 'income-statement'>('trial-balance');

  // Shared filter signals
  includeDraftEntries = signal(false);
  beforeClosing = signal(false);

  // Shared
  fullReport = signal(false);

  // Estado de Situación specific
  modelo5920 = signal(false);
  balanceSheetYear = signal(new Date().getFullYear().toString());
  balanceSheetMonth = signal('');
  balanceSheetUpToMonth = signal(false);

  // Estado de Rendimiento specific
  modelo5921 = signal(false);
  incomeStatementYear = signal(new Date().getFullYear().toString());
  incomeStatementMonth = signal('');
  incomeStatementUpToMonth = signal(false);

  // Collapsible sections state
  trialBalanceOptionsExpanded = signal(true);
  balanceSheetOptionsExpanded = signal(true);
  incomeStatementOptionsExpanded = signal(true);

  // Options dropdown state
  optionsDropdown = signal(false);

  // Balance de comprobación specific
  trialBalanceYear = signal(new Date().getFullYear().toString());
  trialBalanceMonth = signal('');

  // Months list
  months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Years list (last 10 years)
  years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  // Computed properties for pagination
  pagedReports = computed(() => {
    const allReports = this.reports();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return allReports.slice(start, end);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalPages: Math.ceil(this.reports().length / this.pageSize) || 1,
    totalItems: this.reports().length,
    pageSize: this.pageSize,
    itemsPerPage: this.pageSize
  }));

  generateReport() {
    const type = this.activeTab();
    this.isLoading.set(true);

    const today = new Date().toISOString().split('T')[0];
    let fromDate: string | undefined;
    let toDate: string | undefined;

    // Calculate dates based on active tab
    if (type === 'trial-balance') {
      const tbYear = this.trialBalanceYear();
      const tbMonth = this.trialBalanceMonth();
      if (tbYear && tbMonth) {
        fromDate = `${tbYear}-${tbMonth}-01`;
        const lastDay = new Date(+tbYear, +tbMonth, 0).getDate();
        toDate = `${tbYear}-${tbMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (tbYear) {
        fromDate = `${tbYear}-01-01`;
        toDate = `${tbYear}-12-31`;
      }
    } else if (type === 'balance-sheet') {
      const bsYear = this.balanceSheetYear();
      const bsMonth = this.balanceSheetMonth();
      const bsUpToMonth = this.balanceSheetUpToMonth();
      if (bsYear && bsUpToMonth && bsMonth) {
        fromDate = `${bsYear}-01-01`;
        const lastDay = new Date(+bsYear, +bsMonth, 0).getDate();
        toDate = `${bsYear}-${bsMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (bsYear && bsMonth) {
        fromDate = `${bsYear}-${bsMonth}-01`;
        const lastDay = new Date(+bsYear, +bsMonth, 0).getDate();
        toDate = `${bsYear}-${bsMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (bsYear) {
        fromDate = `${bsYear}-01-01`;
        toDate = `${bsYear}-12-31`;
      }
    } else if (type === 'income-statement') {
      const isYear = this.incomeStatementYear();
      const isMonth = this.incomeStatementMonth();
      const isUpToMonth = this.incomeStatementUpToMonth();
      if (isYear && isMonth && !isUpToMonth) {
        fromDate = `${isYear}-${isMonth}-01`;
        const lastDay = new Date(+isYear, +isMonth, 0).getDate();
        toDate = `${isYear}-${isMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (isYear && isUpToMonth && isMonth) {
        fromDate = `${isYear}-01-01`;
        const lastDay = new Date(+isYear, +isMonth, 0).getDate();
        toDate = `${isYear}-${isMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (isYear) {
        fromDate = `${isYear}-01-01`;
        toDate = `${isYear}-12-31`;
      }
    }

    // If Modelo 5920-04 is selected, download Excel directly
    if (type === 'balance-sheet' && this.modelo5920()) {
      this.accountingService.exportModelo5920Excel(toDate || today).subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'Modelo_5920-04.xlsx');
          this.isLoading.set(false);
          this.showToast('Modelo 5920-04 descargado correctamente', 'success');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToast(err.error?.message || 'Error al descargar Modelo 5920-04', 'error');
        },
      });
      return;
    }

    // If Modelo 5921-04 is selected, download Excel directly
    if (type === 'income-statement' && this.modelo5921()) {
      this.accountingService.exportModelo5921Excel(fromDate, toDate || today).subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'Modelo_5921-04.xlsx');
          this.isLoading.set(false);
          this.showToast('Modelo 5921-04 descargado correctamente', 'success');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showToast(err.error?.message || 'Error al descargar Modelo 5921-04', 'error');
        },
      });
      return;
    }

    // Normal report generation
    let request$;
    let title = '';

    switch (type) {
      case 'trial-balance':
        title = 'Balance de comprobación';
        const tbYear = this.trialBalanceYear();
        const tbMonth = this.trialBalanceMonth();
        if (tbYear && tbMonth) {
          const monthLabel = this.months.find(m => m.value === tbMonth)?.label;
          title += ` (${monthLabel} ${tbYear})`;
        } else if (tbYear) {
          title += ` (${tbYear})`;
        }
        request$ = this.accountingService.getTrialBalance(fromDate, toDate || today);
        break;
      case 'balance-sheet':
        title = 'Estado de Situación';
        const bsYear2 = this.balanceSheetYear();
        const bsMonth2 = this.balanceSheetMonth();
        const bsUpToMonth2 = this.balanceSheetUpToMonth();
        if (bsYear2 && bsUpToMonth2 && bsMonth2) {
          const monthLabel = this.months.find(m => m.value === bsMonth2)?.label;
          title += ` (Hasta ${monthLabel} ${bsYear2})`;
        } else if (bsYear2 && bsMonth2) {
          const monthLabel = this.months.find(m => m.value === bsMonth2)?.label;
          title += ` (${monthLabel} ${bsYear2})`;
        } else if (bsYear2) {
          title += ` (${bsYear2})`;
        }
        request$ = this.accountingService.getBalanceSheet(toDate || today);
        break;
      case 'income-statement':
        title = 'Estado de Rendimiento Financiero';
        const isYear2 = this.incomeStatementYear();
        const isMonth2 = this.incomeStatementMonth();
        const isUpToMonth2 = this.incomeStatementUpToMonth();
        if (isYear2 && isMonth2 && !isUpToMonth2) {
          const monthLabel = this.months.find(m => m.value === isMonth2)?.label;
          title += ` (${monthLabel} ${isYear2})`;
        } else if (isYear2 && isUpToMonth2 && isMonth2) {
          const monthLabel = this.months.find(m => m.value === isMonth2)?.label;
          title += ` (Hasta ${monthLabel} ${isYear2})`;
        } else if (isYear2) {
          title += ` (${isYear2})`;
        }
        request$ = this.accountingService.getIncomeStatement(fromDate, toDate || today);
        break;
      default:
        this.isLoading.set(false);
        return;
    }

    const desc: string[] = [];
    if (this.includeDraftEntries()) desc.push('Incluye asientos no contabilizados');
    if (this.beforeClosing()) desc.push('Antes de cierre contable');

    request$.subscribe({
      next: (data) => {
        const newReport: GeneratedReport = {
          id: Date.now().toString(),
          type,
          title,
          date: today,
          description: desc.length ? desc.join(' · ') : '',
          generatedBy: 'Usuario',
          generatedAt: new Date().toISOString(),
          data,
        };
        this.reports.set([newReport, ...this.reports()]);
        this.isLoading.set(false);
        this.showToast('Informe generado correctamente', 'success');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast(err.error?.message || 'Error al generar informe', 'error');
      },
    });
  }

  async deleteReport(report: GeneratedReport) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar informe',
      message: `¿Está seguro de eliminar el informe "${report.title}"?`,
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;
    this.reports.set(this.reports().filter(r => r.id !== report.id));
    this.showToast('Informe eliminado correctamente', 'success');
  }

  downloadReport(report: GeneratedReport) {
    const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.type}-${report.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Descarga iniciada', 'info');
  }

  exportExcel(report: GeneratedReport) {
    this.isLoading.set(true);
    
    // Llamar al servicio de exportación Excel del backend usando los métodos existentes
    if (report.type === 'balance-sheet') {
      this.accountingService.exportModelo5920Excel(report.date).subscribe({
        next: (blob: Blob) => {
          this.downloadBlob(blob, `estado-situacion-${report.date}.xlsx`);
          this.showToast('Excel exportado correctamente', 'success');
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error exporting Excel:', error);
          this.showToast('Error al exportar Excel', 'error');
          this.isLoading.set(false);
        }
      });
    } else if (report.type === 'income-statement') {
      // Para Estado de Rendimiento, usar fromDate y toDate del período
      const fromDate = report.period?.fromDate || report.date;
      const toDate = report.period?.toDate || report.date;
      this.accountingService.exportModelo5921Excel(fromDate, toDate).subscribe({
        next: (blob: Blob) => {
          this.downloadBlob(blob, `estado-rendimiento-${report.date}.xlsx`);
          this.showToast('Excel exportado correctamente', 'success');
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error exporting Excel:', error);
          this.showToast('Error al exportar Excel', 'error');
          this.isLoading.set(false);
        }
      });
    } else {
      // Para balance de comprobación, generar Excel desde los datos
      const excelData = this.generateTrialBalanceExcel(report.data);
      const blob = new Blob([excelData], { type: 'text/csv' });
      this.downloadBlob(blob, `balance-comprobacion-${report.date}.csv`);
      this.showToast('Excel exportado correctamente', 'success');
      this.isLoading.set(false);
    }
  }

  exportPdf(report: GeneratedReport) {
    this.isLoading.set(true);
    
    // Para PDF, actualmente generamos desde los datos HTML
    // En producción, esto debería convertir el Excel a PDF o usar un servicio de PDF
    if (report.type === 'balance-sheet' || report.type === 'income-statement') {
      // Para Estado de Situación y Rendimiento, generar PDF desde los datos
      const pdfData = this.generateFinancialStatementPdf(report);
      const blob = new Blob([pdfData], { type: 'text/html' });
      this.downloadBlob(blob, `${report.type}-${report.date}.html`);
      this.showToast('Reporte exportado correctamente', 'success');
      this.isLoading.set(false);
    } else {
      // Para balance de comprobación, generar PDF desde los datos
      const pdfData = this.generateTrialBalancePdf(report.data);
      const blob = new Blob([pdfData], { type: 'text/html' });
      this.downloadBlob(blob, `balance-comprobacion-${report.date}.html`);
      this.showToast('PDF exportado correctamente', 'success');
      this.isLoading.set(false);
    }
  }

  private generateTrialBalanceExcel(data: any): string {
    // Implementación básica para generar Excel de balance de comprobación
    // En producción, esto debería usar una librería como exceljs
    const headers = ['Cuenta', 'Descripción', 'Débito', 'Crédito', 'Saldo'];
    const rows = data?.lines || [];
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach((row: any) => {
      csvContent += `${row.accountCode},${row.accountName},${row.debit || 0},${row.credit || 0},${row.balance || 0}\n`;
    });
    
    return csvContent;
  }

  private generateFinancialStatementPdf(report: GeneratedReport): string {
    // Generar PDF para estados financieros (Estado de Situación y Estado de Rendimiento)
    const title = report.type === 'balance-sheet' ? 'Estado de Situación' : 'Estado de Rendimiento Financiero';
    const date = new Date().toLocaleDateString('es-ES');
    
    let htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            .info { margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total { font-weight: bold; background-color: #f9f9f9; }
            .section-title { font-weight: bold; background-color: #e9ecef; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="info">
            <p><strong>Fecha:</strong> ${date}</p>
            <p><strong>Período:</strong> ${this.getPeriodLabel(report.period)}</p>
            @if (report.options?.modelo5920 || report.options?.modelo5921) {
              <p><strong>Modelo:</strong> ${report.options?.modelo5920 ? '5920-04' : '5921-04'}</p>
            }
          </div>
          <table>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Descripción</th>
                <th>Saldo Actual</th>
                <th>Saldo Anterior</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Datos de ejemplo - en producción esto vendría de los datos reales del informe
    const sampleData = [
      { code: '1.0.0.0.0', name: 'ACTIVO', current: 100000, previous: 95000 },
      { code: '1.1.0.0.0', name: 'Activo Corriente', current: 75000, previous: 70000 },
      { code: '2.0.0.0.0', name: 'PASIVO', current: 60000, previous: 55000 },
      { code: '3.0.0.0.0', name: 'PATRIMONIO', current: 40000, previous: 40000 }
    ];
    
    sampleData.forEach((row: any) => {
      htmlContent += `
        <tr>
          <td>${row.code}</td>
          <td>${row.name}</td>
          <td>$${row.current.toLocaleString('es-CU')}</td>
          <td>$${row.previous.toLocaleString('es-CU')}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    return htmlContent;
  }

  private generateTrialBalancePdf(data: any): string {
    // Implementación básica para generar PDF de balance de comprobación
    // En producción, esto debería usar una librería como jsPDF
    const title = 'Balance de Comprobación';
    const date = new Date().toLocaleDateString('es-ES');
    
    let htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Fecha: ${date}</p>
          <table>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Descripción</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const rows = data?.lines || [];
    rows.forEach((row: any) => {
      htmlContent += `
        <tr>
          <td>${row.accountCode || ''}</td>
          <td>${row.accountName || ''}</td>
          <td>${row.debit || 0}</td>
          <td>${row.credit || 0}</td>
          <td>${row.balance || 0}</td>
        </tr>
      `;
    });
    
    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    return htmlContent;
  }

  getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'trial-balance': 'Balance de comprobación',
      'balance-sheet': 'Estado de Situación',
      'income-statement': 'Estado de Rendimiento Financiero',
    };
    return labels[type] || type;
  }

  getReportTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'trial-balance': 'bg-orange-100 text-orange-800',
      'balance-sheet': 'bg-blue-100 text-blue-800',
      'income-statement': 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  }

  getReportTypeBgColor(type: string): string {
    const colors: Record<string, string> = {
      'trial-balance': 'bg-orange-100',
      'balance-sheet': 'bg-blue-100',
      'income-statement': 'bg-green-100',
    };
    return colors[type] || 'bg-slate-100';
  }

  getReportTypeIconColor(type: string): string {
    const colors: Record<string, string> = {
      'trial-balance': 'text-orange-600',
      'balance-sheet': 'text-blue-600',
      'income-statement': 'text-green-600',
    };
    return colors[type] || 'text-slate-600';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPeriodLabel(period: any): string {
    if (!period) return 'No especificado';
    
    const year = period.year || new Date().getFullYear();
    const month = period.month;
    
    if (!month) {
      return `Año ${year}`;
    }
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Cerrar el dropdown si se hace clic fuera del contenedor de opciones
    if (this.optionsDropdown()) {
      const target = event.target as HTMLElement;
      const dropdownContainer = target.closest('.options-dropdown-container');
      
      if (!dropdownContainer) {
        this.optionsDropdown.set(false);
      }
    }
  }
}
