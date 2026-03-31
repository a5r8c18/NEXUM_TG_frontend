import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, AccountingReport, ReportFilters } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reports.template.html',
})
export class ReportsComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);

  reports = signal<AccountingReport[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  reportType = signal('');
  dateFrom = signal('');
  dateTo = signal('');
  accountCode = signal('');

  // Modals
  showGenerateModal = signal(false);
  selectedReport = signal<AccountingReport | null>(null);

  reportForm: FormGroup;

  // Report types
  reportTypes = [
    { value: 'balance', label: 'Balance General', description: 'Estado de situación financiera' },
    { value: 'income-statement', label: 'Estado de Resultados', description: 'Pérdidas y ganancias' },
    { value: 'cash-flow', label: 'Flujo de Efectivo', description: 'Movimientos de caja' },
    { value: 'trial-balance', label: 'Balance de Comprobación', description: 'Sumas y saldos' },
    { value: 'aged-receivables', label: 'Cuentas por Cobrar', description: 'Antigüedad de saldos' },
    { value: 'budget-variance', label: 'Variación Presupuestaria', description: 'Comparación presupuesto vs real' },
    { value: 'cost-analysis', label: 'Análisis de Costos', description: 'Desglose por centros de costo' },
    { value: 'profit-loss', label: 'Pérdidas y Ganancias Detallado', description: 'Análisis detallado de resultados' }
  ];

  filteredReports = computed(() => {
    let filtered = this.reports();
    
    if (this.reportType()) {
      filtered = filtered.filter((r) => r.type === this.reportType());
    }
    
    if (this.dateFrom()) {
      filtered = filtered.filter((r) => r.date >= this.dateFrom());
    }
    
    if (this.dateTo()) {
      filtered = filtered.filter((r) => r.date <= this.dateTo());
    }
    
    if (this.accountCode()) {
      filtered = filtered.filter((r) => r.data.some((item: any) => item.accountCode === this.accountCode()));
    }
    
    return filtered;
  });

  constructor() {
    this.reportForm = this.fb.group({
      type: ['balance', Validators.required],
      dateFrom: ['', Validators.required],
      dateTo: ['', Validators.required],
      accountCode: [''],
      format: ['pdf'],
      includeDetails: [true],
      includeInactive: [false]
    });
  }

  ngOnInit() {
    this.loadReports();
  }

  loadReports() {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    // Simulación - en producción esto llamaría al servicio real
    setTimeout(() => {
      this.reports.set([
        {
          id: '1',
          type: 'balance',
          title: 'Balance General - Enero 2024',
          date: '2024-01-31',
          description: 'Balance general de cierre del mes',
          generatedBy: 'Sistema Contable',
          generatedAt: '2024-01-31T23:59:59Z',
          fileSize: '2.5 MB',
          downloadUrl: '/api/reports/download/1',
          data: []
        },
        {
          id: '2',
          type: 'income-statement',
          title: 'Estado de Resultados - Enero 2024',
          date: '2024-01-31',
          description: 'Estado de pérdidas y ganancias del período',
          generatedBy: 'Sistema Contable',
          generatedAt: '2024-01-31T23:59:59Z',
          fileSize: '1.8 MB',
          downloadUrl: '/api/reports/download/2',
          data: []
        }
      ]);
      this.isLoading.set(false);
    }, 1000);
  }

  // Actions
  openGenerateModal() {
    this.reportForm.reset({
      type: 'balance',
      dateFrom: '',
      dateTo: '',
      accountCode: '',
      format: 'pdf',
      includeDetails: true,
      includeInactive: false
    });
    this.showGenerateModal.set(true);
  }

  closeModals() {
    this.showGenerateModal.set(false);
    this.selectedReport.set(null);
  }

  generateReport() {
    if (this.reportForm.invalid) return;

    const reportData = this.reportForm.value;
    
    // Simulación - en producción esto llamaría al servicio real
    this.isLoading.set(true);
    
    setTimeout(() => {
      const newReport: AccountingReport = {
        id: Date.now().toString(),
        type: reportData.type,
        title: `${this.getReportTypeLabel(reportData.type)} - ${reportData.dateFrom}`,
        date: reportData.dateTo,
        description: `Informe generado automáticamente`,
        generatedBy: 'Usuario Actual',
        generatedAt: new Date().toISOString(),
        fileSize: '1.5 MB',
        downloadUrl: `/api/reports/download/${Date.now()}`,
        data: []
      };
      
      this.reports.set([newReport, ...this.reports()]);
      this.isLoading.set(false);
      this.closeModals();
      this.showToast('Informe generado correctamente', 'success');
    }, 2000);
  }

  downloadReport(report: AccountingReport) {
    // Simulación de descarga
    window.open(report.downloadUrl, '_blank');
    this.showToast('Descarga iniciada', 'info');
  }

  deleteReport(report: AccountingReport) {
    if (confirm(`¿Está seguro de eliminar el informe "${report.title}"?`)) {
      this.reports.set(this.reports().filter(r => r.id !== report.id));
      this.showToast('Informe eliminado correctamente', 'success');
    }
  }

  previewReport(report: AccountingReport) {
    this.selectedReport.set(report);
  }

  // Filters
  applyFilters() {
    // Los filtros se aplican automáticamente con los computed signals
  }

  resetFilters() {
    this.reportType.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.accountCode.set('');
  }

  // Helper methods
  getReportTypeLabel(type: string): string {
    const reportType = this.reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.label : type;
  }

  getReportTypeDescription(type: string): string {
    const reportType = this.reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.description : '';
  }

  getReportTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'balance': 'scale-unflipped',
      'income-statement': 'trending-up',
      'cash-flow': 'banknote',
      'trial-balance': 'calculator',
      'aged-receivables': 'clock',
      'budget-variance': 'bar-chart',
      'cost-analysis': 'pie-chart',
      'profit-loss': 'trending-up'
    };
    return icons[type] || 'file-text';
  }

  getReportTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'balance': 'bg-blue-100 text-blue-800',
      'income-statement': 'bg-green-100 text-green-800',
      'cash-flow': 'bg-purple-100 text-purple-800',
      'trial-balance': 'bg-orange-100 text-orange-800',
      'aged-receivables': 'bg-red-100 text-red-800',
      'budget-variance': 'bg-indigo-100 text-indigo-800',
      'cost-analysis': 'bg-pink-100 text-pink-800',
      'profit-loss': 'bg-emerald-100 text-emerald-800'
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  }

  formatFileSize(size: string): string {
    return size;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
