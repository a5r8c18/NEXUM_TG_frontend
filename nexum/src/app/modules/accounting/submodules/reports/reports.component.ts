import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.template.html',
})
export class ReportsComponent {
  private accountingService = inject(AccountingService);
  private confirmDialog = inject(ConfirmDialogService);

  reports = signal<GeneratedReport[]>([]);
  isLoading = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  // Comprobación de Saldos specific
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
        title = 'Comprobación de Saldos';
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

  getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'trial-balance': 'Comprobación de Saldos',
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

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
