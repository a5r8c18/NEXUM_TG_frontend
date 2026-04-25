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
    modelo5924?: boolean;
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
  activeTab = signal<'trial-balance' | 'balance-sheet' | 'income-statement' | 'expense-breakdown'>('trial-balance');

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

  // Gastos por Subelementos specific
  modelo5924 = signal(false);
  expenseBreakdownYear = signal(new Date().getFullYear().toString());
  expenseBreakdownMonth = signal('');
  expenseBreakdownUpToMonth = signal(false);

  // Collapsible sections state
  trialBalanceOptionsExpanded = signal(true);
  balanceSheetOptionsExpanded = signal(true);
  incomeStatementOptionsExpanded = signal(true);
  expenseBreakdownOptionsExpanded = signal(true);

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
    } else if (type === 'expense-breakdown') {
      const ebYear = this.expenseBreakdownYear();
      const ebMonth = this.expenseBreakdownMonth();
      const ebUpToMonth = this.expenseBreakdownUpToMonth();
      if (ebYear && ebMonth && !ebUpToMonth) {
        fromDate = `${ebYear}-${ebMonth}-01`;
        const lastDay = new Date(+ebYear, +ebMonth, 0).getDate();
        toDate = `${ebYear}-${ebMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (ebYear && ebUpToMonth && ebMonth) {
        fromDate = `${ebYear}-01-01`;
        const lastDay = new Date(+ebYear, +ebMonth, 0).getDate();
        toDate = `${ebYear}-${ebMonth}-${String(lastDay).padStart(2, '0')}`;
      } else if (ebYear) {
        fromDate = `${ebYear}-01-01`;
        toDate = `${ebYear}-12-31`;
      }
    }

    // Build title and request for all report types
    let request$: any;
    let title = '';

    switch (type) {
      case 'trial-balance': {
        title = 'Balance de Comprobación';
        const tbYear = this.trialBalanceYear();
        const tbMonth = this.trialBalanceMonth();
        if (tbYear && tbMonth) {
          const ml = this.months.find(m => m.value === tbMonth)?.label;
          title += ` (${ml} ${tbYear})`;
        } else if (tbYear) {
          title += ` (${tbYear})`;
        }
        request$ = this.accountingService.getTrialBalance(fromDate, toDate || today);
        break;
      }
      case 'balance-sheet': {
        title = 'Estado de Situación';
        const bsYear = this.balanceSheetYear();
        const bsMonth = this.balanceSheetMonth();
        const bsUp = this.balanceSheetUpToMonth();
        if (bsYear && bsUp && bsMonth) {
          title += ` (Hasta ${this.months.find(m => m.value === bsMonth)?.label} ${bsYear})`;
        } else if (bsYear && bsMonth) {
          title += ` (${this.months.find(m => m.value === bsMonth)?.label} ${bsYear})`;
        } else if (bsYear) {
          title += ` (${bsYear})`;
        }
        request$ = this.accountingService.getBalanceSheet(toDate || today);
        break;
      }
      case 'income-statement': {
        title = 'Estado de Rendimiento Financiero';
        const isYear = this.incomeStatementYear();
        const isMonth = this.incomeStatementMonth();
        const isUp = this.incomeStatementUpToMonth();
        if (isYear && isMonth && !isUp) {
          title += ` (${this.months.find(m => m.value === isMonth)?.label} ${isYear})`;
        } else if (isYear && isUp && isMonth) {
          title += ` (Hasta ${this.months.find(m => m.value === isMonth)?.label} ${isYear})`;
        } else if (isYear) {
          title += ` (${isYear})`;
        }
        request$ = this.accountingService.getIncomeStatement(fromDate, toDate || today);
        break;
      }
      case 'expense-breakdown': {
        title = 'Gastos por Subelementos';
        const ebYear = this.expenseBreakdownYear();
        const ebMonth = this.expenseBreakdownMonth();
        const ebUp = this.expenseBreakdownUpToMonth();
        if (ebYear && ebMonth && !ebUp) {
          title += ` (${this.months.find(m => m.value === ebMonth)?.label} ${ebYear})`;
        } else if (ebYear && ebUp && ebMonth) {
          title += ` (Hasta ${this.months.find(m => m.value === ebMonth)?.label} ${ebYear})`;
        } else if (ebYear) {
          title += ` (${ebYear})`;
        }
        request$ = this.accountingService.getExpenseBreakdown(fromDate, toDate || today);
        break;
      }
      default:
        this.isLoading.set(false);
        return;
    }

    const desc: string[] = [];
    if (this.includeDraftEntries()) desc.push('Incluye borradores');
    if (this.beforeClosing()) desc.push('Antes de cierre');

    request$.subscribe({
      next: (data: any) => {
        const newReport: GeneratedReport = {
          id: Date.now().toString(),
          type,
          title,
          date: today,
          description: desc.length ? desc.join(' · ') : '',
          generatedBy: 'Usuario',
          generatedAt: new Date().toISOString(),
          data,
          period: { year: this.getActiveYear(), month: this.getActiveMonth(), fromDate, toDate },
          options: {
            modelo5920: this.modelo5920(),
            modelo5921: this.modelo5921(),
            modelo5924: this.modelo5924(),
          },
        };
        this.reports.set([newReport, ...this.reports()]);
        this.isLoading.set(false);
        this.showToast('Informe generado correctamente', 'success');
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.showToast(err.error?.message || 'Error al generar informe', 'error');
      },
    });
  }

  private getActiveYear(): string {
    switch (this.activeTab()) {
      case 'trial-balance': return this.trialBalanceYear();
      case 'balance-sheet': return this.balanceSheetYear();
      case 'income-statement': return this.incomeStatementYear();
      case 'expense-breakdown': return this.expenseBreakdownYear();
    }
  }

  private getActiveMonth(): string {
    switch (this.activeTab()) {
      case 'trial-balance': return this.trialBalanceMonth();
      case 'balance-sheet': return this.balanceSheetMonth();
      case 'income-statement': return this.incomeStatementMonth();
      case 'expense-breakdown': return this.expenseBreakdownMonth();
    }
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

  exportExcel(report: GeneratedReport) {
    this.isLoading.set(true);
    const fd = report.period?.fromDate;
    const td = report.period?.toDate || report.date;

    let export$: any;
    let filename = '';

    switch (report.type) {
      case 'trial-balance':
        export$ = this.accountingService.exportTrialBalanceExcel(fd, td);
        filename = `balance-comprobacion-${report.date}.xlsx`;
        break;
      case 'balance-sheet':
        if (report.options?.modelo5920) {
          export$ = this.accountingService.exportModelo5920Excel(td);
          filename = `Modelo_5920-04-${report.date}.xlsx`;
        } else {
          export$ = this.accountingService.exportBalanceSheetExcel(td);
          filename = `estado-situacion-${report.date}.xlsx`;
        }
        break;
      case 'income-statement':
        if (report.options?.modelo5921) {
          export$ = this.accountingService.exportModelo5921Excel(fd, td);
          filename = `Modelo_5921-04-${report.date}.xlsx`;
        } else {
          export$ = this.accountingService.exportIncomeStatementExcel(fd, td);
          filename = `estado-rendimiento-${report.date}.xlsx`;
        }
        break;
      case 'expense-breakdown':
        export$ = this.accountingService.exportExpenseBreakdownExcel(fd, td);
        filename = report.options?.modelo5924
          ? `Modelo_5924-${report.date}.xlsx`
          : `gastos-subelementos-${report.date}.xlsx`;
        break;
      default:
        this.isLoading.set(false);
        return;
    }

    export$.subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, filename);
        this.showToast('Excel exportado correctamente', 'success');
        this.isLoading.set(false);
      },
      error: () => {
        this.showToast('Error al exportar Excel', 'error');
        this.isLoading.set(false);
      },
    });
  }

  async exportPdf(report: GeneratedReport) {
    this.isLoading.set(true);
    try {
      const jspdfModule = await import('jspdf');
      await import('jspdf-autotable');
      const jsPDF = jspdfModule.jsPDF;

      const doc = new jsPDF('landscape', 'mm', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.text(report.title, pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Fecha: ${this.formatDate(report.generatedAt)}   Período: ${this.getPeriodLabel(report.period)}`, pageWidth / 2, 22, { align: 'center' });

      const fmtNum = (n: number) => Number(n || 0).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      if (report.type === 'trial-balance') {
        const rows = (report.data || []).map((r: any) => [
          r.accountCode, r.accountName, fmtNum(r.openingBalance),
          fmtNum(r.periodDebit), fmtNum(r.periodCredit), fmtNum(r.closingBalance),
        ]);
        const totals = (report.data || []).reduce((t: any, r: any) => ({
          ob: t.ob + Number(r.openingBalance || 0), pd: t.pd + Number(r.periodDebit || 0),
          pc: t.pc + Number(r.periodCredit || 0), cb: t.cb + Number(r.closingBalance || 0),
        }), { ob: 0, pd: 0, pc: 0, cb: 0 });
        rows.push(['', 'TOTALES', fmtNum(totals.ob), fmtNum(totals.pd), fmtNum(totals.pc), fmtNum(totals.cb)]);

        (doc as any).autoTable({
          head: [['Código', 'Cuenta', 'Saldo Inicial', 'Débitos', 'Créditos', 'Saldo Final']],
          body: rows,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
          footStyles: { fontStyle: 'bold' },
        });
      } else if (report.type === 'balance-sheet') {
        const d = report.data || {};
        const body: any[] = [];
        body.push([{ content: 'ACTIVOS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [219, 234, 254] } }]);
        (d.assets?.items || []).forEach((i: any) => body.push([i.accountCode, i.accountName, fmtNum(i.balance)]));
        body.push([{ content: '', styles: {} }, { content: 'Total Activos', styles: { fontStyle: 'bold' } }, { content: fmtNum(d.assets?.total), styles: { fontStyle: 'bold' } }]);
        body.push([{ content: 'PASIVOS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [254, 226, 226] } }]);
        (d.liabilities?.items || []).forEach((i: any) => body.push([i.accountCode, i.accountName, fmtNum(Math.abs(Number(i.balance)))]));
        body.push([{ content: '', styles: {} }, { content: 'Total Pasivos', styles: { fontStyle: 'bold' } }, { content: fmtNum(d.liabilities?.total), styles: { fontStyle: 'bold' } }]);
        body.push([{ content: 'PATRIMONIO', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }]);
        (d.equity?.items || []).forEach((i: any) => body.push([i.accountCode, i.accountName, fmtNum(Math.abs(Number(i.balance)))]));
        body.push([{ content: '', styles: {} }, { content: 'Total Patrimonio', styles: { fontStyle: 'bold' } }, { content: fmtNum(d.equity?.total), styles: { fontStyle: 'bold' } }]);

        (doc as any).autoTable({
          head: [['Código', 'Cuenta', 'Saldo']],
          body,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        });
      } else if (report.type === 'income-statement') {
        const d = report.data || {};
        const body: any[] = [];
        body.push([{ content: 'INGRESOS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }]);
        (d.income?.items || []).forEach((i: any) => body.push([i.accountCode, i.accountName, fmtNum(Math.abs(Number(i.totalCredit) - Number(i.totalDebit)))]));
        body.push([{ content: '', styles: {} }, { content: 'Total Ingresos', styles: { fontStyle: 'bold' } }, { content: fmtNum(d.income?.total), styles: { fontStyle: 'bold' } }]);
        body.push([{ content: 'GASTOS', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [254, 226, 226] } }]);
        (d.expenses?.items || []).forEach((i: any) => body.push([i.accountCode, i.accountName, fmtNum(Math.abs(Number(i.totalDebit) - Number(i.totalCredit)))]));
        body.push([{ content: '', styles: {} }, { content: 'Total Gastos', styles: { fontStyle: 'bold' } }, { content: fmtNum(d.expenses?.total), styles: { fontStyle: 'bold' } }]);
        body.push([{ content: '', styles: {} }, { content: 'RESULTADO NETO', styles: { fontStyle: 'bold', fontSize: 10 } }, { content: fmtNum(d.netProfit), styles: { fontStyle: 'bold', fontSize: 10 } }]);

        (doc as any).autoTable({
          head: [['Código', 'Cuenta', 'Importe']],
          body,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        });
      } else if (report.type === 'expense-breakdown') {
        const d = report.data || {};
        const body: any[] = [];
        (d.elements || []).forEach((el: any) => {
          body.push([{ content: `${el.elementCode} - ${el.elementName}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [243, 244, 246] } }, { content: fmtNum(el.total), styles: { fontStyle: 'bold' } }]);
          (el.subelements || []).forEach((sub: any) => {
            body.push([`  ${sub.subelementCode}`, sub.subelementName, fmtNum(sub.total)]);
          });
        });
        body.push([{ content: '', styles: {} }, { content: 'TOTAL GENERAL', styles: { fontStyle: 'bold', fontSize: 10 } }, { content: fmtNum(d.grandTotal), styles: { fontStyle: 'bold', fontSize: 10 } }]);

        (doc as any).autoTable({
          head: [['Código', 'Elemento / Subelemento', 'Importe']],
          body,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        });
      }

      doc.save(`${report.type}-${report.date}.pdf`);
      this.showToast('PDF exportado correctamente', 'success');
    } catch (e) {
      console.error('Error generating PDF:', e);
      this.showToast('Error al generar PDF. Verifique que jspdf está instalado.', 'error');
    }
    this.isLoading.set(false);
  }

  getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'trial-balance': 'Balance de Comprobación',
      'balance-sheet': 'Estado de Situación',
      'income-statement': 'Estado de Rendimiento',
      'expense-breakdown': 'Gastos por Subelementos',
    };
    return labels[type] || type;
  }

  getReportTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'trial-balance': 'bg-orange-100 text-orange-800',
      'balance-sheet': 'bg-blue-100 text-blue-800',
      'income-statement': 'bg-green-100 text-green-800',
      'expense-breakdown': 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  }

  getReportTypeBgColor(type: string): string {
    const colors: Record<string, string> = {
      'trial-balance': 'bg-orange-100',
      'balance-sheet': 'bg-blue-100',
      'income-statement': 'bg-green-100',
      'expense-breakdown': 'bg-purple-100',
    };
    return colors[type] || 'bg-slate-100';
  }

  getReportTypeIconColor(type: string): string {
    const colors: Record<string, string> = {
      'trial-balance': 'text-orange-600',
      'balance-sheet': 'text-blue-600',
      'income-statement': 'text-green-600',
      'expense-breakdown': 'text-purple-600',
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
