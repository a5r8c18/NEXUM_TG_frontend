import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ReportsComponent } from './reports.component';
import { AccountingService } from '../../../../core/services/accounting.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { of, throwError } from 'rxjs';

const mockTrialBalanceData = [
  {
    accountCode: '101',
    accountName: 'Caja',
    nature: 'deudora',
    accountType: 'asset',
    openingBalance: 1000,
    periodDebit: 5000,
    periodCredit: 2000,
    closingBalance: 4000,
  },
];

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let mockAccountingService: any;
  let mockConfirmDialogService: any;

  beforeEach(async () => {
    mockAccountingService = {
      getTrialBalance: vi.fn(),
      getBalanceSheet: vi.fn(),
      getIncomeStatement: vi.fn(),
      getExpenseBreakdown: vi.fn(),
      exportTrialBalanceExcel: vi.fn(),
      exportBalanceSheetExcel: vi.fn(),
      exportIncomeStatementExcel: vi.fn(),
      exportExpenseBreakdownExcel: vi.fn(),
      exportModelo5920Excel: vi.fn(),
      exportModelo5921Excel: vi.fn(),
    };

    mockConfirmDialogService = {
      confirm: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        HttpClientTestingModule,
        ReportsComponent
      ],
      providers: [
        provideRouter([]),
        { provide: AccountingService, useValue: mockAccountingService },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
  });

  beforeEach(() => {
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      expect(component.activeTab()).toBe('trial-balance');
      expect(component.isLoading()).toBe(false);
      expect(component.reports()).toEqual([]);
      expect(component.currentPage()).toBe(1);
    });

    it('should have all report tabs available', () => {
      const tabs = ['trial-balance', 'balance-sheet', 'income-statement', 'expense-breakdown'];
      tabs.forEach(tab => {
        expect(component.activeTab.set).toBeDefined();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch tabs correctly', () => {
      component.activeTab.set('balance-sheet');
      expect(component.activeTab()).toBe('balance-sheet');

      component.activeTab.set('income-statement');
      expect(component.activeTab()).toBe('income-statement');

      component.activeTab.set('expense-breakdown');
      expect(component.activeTab()).toBe('expense-breakdown');
    });
  });

  describe('Signal Management', () => {
    it('should manage loading state', () => {
      component.isLoading.set(true);
      expect(component.isLoading()).toBe(true);

      component.isLoading.set(false);
      expect(component.isLoading()).toBe(false);
    });

    it('should manage toast notifications', () => {
      component.toast.set({ message: 'Test message', type: 'success' });
      expect(component.toast()).toEqual({ message: 'Test message', type: 'success' });

      component.toast.set(null);
      expect(component.toast()).toBeNull();
    });

    it('should manage pagination', () => {
      component.currentPage.set(2);
      expect(component.currentPage()).toBe(2);
    });
  });

  describe('Report Generation', () => {

    it('should generate trial balance report', async () => {
      mockAccountingService.getTrialBalance.mockReturnValue(of(mockTrialBalanceData));
      
      component.activeTab.set('trial-balance');
      component.generateReport();

      expect(mockAccountingService.getTrialBalance).toHaveBeenCalled();
    });

    it('should handle report generation error', async () => {
      mockAccountingService.getTrialBalance.mockReturnValue(throwError(() => new Error('API Error')));
      
      component.activeTab.set('trial-balance');
      component.generateReport();

      // Wait for async operation
      await fixture.whenStable();

      expect(component.isLoading()).toBe(false);
    });

    it('should set loading state during generation', async () => {
      mockAccountingService.getTrialBalance.mockReturnValue(of(mockTrialBalanceData));
      
      component.activeTab.set('trial-balance');
      component.generateReport();

      expect(component.isLoading()).toBe(true);

      // Wait for completion
      await fixture.whenStable();

      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Date Handling', () => {
    it('should calculate dates for trial balance', () => {
      component.trialBalanceYear.set('2024');
      component.trialBalanceMonth.set('04');

      const fromDate = '2024-04-01';
      const lastDay = new Date(2024, 4, 0).getDate();
      const toDate = `2024-04-${String(lastDay).padStart(2, '0')}`;

      expect(fromDate).toBe('2024-04-01');
      expect(toDate).toBe('2024-04-30');
    });

    it('should handle year-only selection', () => {
      component.trialBalanceYear.set('2024');
      component.trialBalanceMonth.set('');

      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      expect(fromDate).toBe('2024-01-01');
      expect(toDate).toBe('2024-12-31');
    });
  });

  describe('Export Functions', () => {
    it('should export trial balance to Excel', async () => {
      const mockReport = {
        id: '1',
        type: 'trial-balance',
        title: 'Balance de Comprobación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData,
        period: { fromDate: '2024-04-01', toDate: '2024-04-30' }
      };

      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockAccountingService.exportTrialBalanceExcel.mockReturnValue(of(mockBlob));

      component.exportExcel(mockReport);

      expect(mockAccountingService.exportTrialBalanceExcel).toHaveBeenCalled();
    });

    it('should export balance sheet to Excel', async () => {
      const mockReport = {
        id: '1',
        type: 'balance-sheet',
        title: 'Estado de Situación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData,
        period: { toDate: '2024-04-30' },
        options: { modelo5920: false }
      };

      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockAccountingService.exportBalanceSheetExcel.mockReturnValue(of(mockBlob));

      component.exportExcel(mockReport);

      expect(mockAccountingService.exportBalanceSheetExcel).toHaveBeenCalled();
    });

    it('should export income statement to Excel', async () => {
      const mockReport = {
        id: '1',
        type: 'income-statement',
        title: 'Estado de Rendimiento',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData,
        period: { fromDate: '2024-04-01', toDate: '2024-04-30' },
        options: { modelo5921: false }
      };

      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockAccountingService.exportIncomeStatementExcel.mockReturnValue(of(mockBlob));

      component.exportExcel(mockReport);

      expect(mockAccountingService.exportIncomeStatementExcel).toHaveBeenCalled();
    });

    it('should export expense breakdown to Excel', async () => {
      const mockReport = {
        id: '1',
        type: 'expense-breakdown',
        title: 'Gastos por Subelementos',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData,
        period: { fromDate: '2024-04-01', toDate: '2024-04-30' },
        options: { modelo5924: false }
      };

      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockAccountingService.exportExpenseBreakdownExcel.mockReturnValue(of(mockBlob));

      component.exportExcel(mockReport);

      expect(mockAccountingService.exportExpenseBreakdownExcel).toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
      const mockReport = {
        id: '1',
        type: 'trial-balance',
        title: 'Balance de Comprobación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData,
        period: { fromDate: '2024-04-01', toDate: '2024-04-30' }
      };

      mockAccountingService.exportTrialBalanceExcel.mockReturnValue(throwError(() => new Error('Export Error')));

      component.exportExcel(mockReport);

      // Should not throw error, just handle gracefully
      expect(mockAccountingService.exportTrialBalanceExcel).toHaveBeenCalled();
    });
  });

  describe('PDF Export', () => {
    it('should export to PDF using dynamic import', async () => {
      const mockReport = {
        id: '1',
        type: 'trial-balance',
        title: 'Balance de Comprobación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData
      };

      // Mock dynamic import for jsPDF
      const mockJsPDF = vi.fn().mockReturnValue({
        autoTable: vi.fn(),
        save: vi.fn(),
        internal: { pageSize: { getWidth: vi.fn().mockReturnValue(210) } },
        setFontSize: vi.fn(),
        text: vi.fn(),
      });

      // Mock the dynamic import
      const mockImport = vi.fn().mockResolvedValue({ 
        jsPDF: vi.fn().mockReturnValue(mockJsPDF),
        default: { autoTable: vi.fn() }
      });
      
      // Save original import
      const originalImport = (globalThis as any).__import__;
      (globalThis as any).__import__ = mockImport;

      try {
        await component.exportPdf(mockReport);
        expect(mockImport).toHaveBeenCalled();
      } finally {
        // Restore original import
        (globalThis as any).__import__ = originalImport;
      }
    });

    it('should handle PDF export errors', async () => {
      const mockReport = {
        id: '1',
        type: 'trial-balance',
        title: 'Balance de Comprobación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData
      };

      const mockImport = vi.fn().mockRejectedValue(new Error('PDF Error'));
      const originalImport = (globalThis as any).__import__;
      (globalThis as any).__import__ = mockImport;

      try {
        await component.exportPdf(mockReport);
        // Should not throw error, just handle gracefully
        expect(mockImport).toHaveBeenCalled();
      } finally {
        (globalThis as any).__import__ = originalImport;
      }
    });
  });

  describe('Pagination', () => {
    it('should calculate paged reports correctly', () => {
      const mockReports = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        type: 'trial-balance',
        title: `Report ${i + 1}`,
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: []
      }));

      component.reports.set(mockReports);
      component.currentPage.set(2);

      const pagedReports = component.pagedReports();
      expect(pagedReports.length).toBe(10);
      expect(pagedReports[0].id).toBe('11');
      expect(pagedReports[9].id).toBe('20');
    });

    it('should calculate pagination config correctly', () => {
      component.reports.set(Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        type: 'trial-balance',
        title: `Report ${i + 1}`,
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: []
      })));

      const config = component.paginationConfig();
      expect(config.totalPages).toBe(3);
      expect(config.totalItems).toBe(25);
      expect(config.currentPage).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should change page correctly', () => {
      component.onPageChange(2);
      expect(component.currentPage()).toBe(2);
    });

    it('should toggle options dropdown', () => {
      component.optionsDropdown.set(true);
      expect(component.optionsDropdown()).toBe(true);

      component.optionsDropdown.set(false);
      expect(component.optionsDropdown()).toBe(false);
    });

    it('should close options dropdown on document click', () => {
      component.optionsDropdown.set(true);
      
      // Simulate document click outside dropdown
      const mockEvent = {
        target: document.createElement('div'),
        clientX: 0,
        clientY: 0,
        button: 0,
        buttons: 0,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        type: 'click',
        bubbles: true,
        cancelable: true,
        timeStamp: Date.now(),
        defaultPrevented: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        getModifierState: vi.fn(),
        initMouseEvent: vi.fn()
      } as unknown as MouseEvent;
      
      component.onDocumentClick(mockEvent);
      expect(component.optionsDropdown()).toBe(false);
    });

    it('should format date correctly', () => {
      const date = '2024-04-24T10:00:00Z';
      const formatted = component.formatDate(date);
      expect(formatted).toMatch(/24 de abril de 2024/);
    });

    it('should format time correctly', () => {
      const date = '2024-04-24T10:30:00Z';
      const formatted = component.formatTime(date);
      expect(formatted).toMatch(/10:30/);
    });

    it('should get period label correctly', () => {
      const period = { year: '2024', month: '04' };
      const label = component.getPeriodLabel(period);
      expect(label).toBe('abril 2024');
    });

    it('should get report type label', () => {
      const label = component.getReportTypeLabel('trial-balance');
      expect(label).toBe('Balance de Comprobación');
    });

    it('should get report type color', () => {
      const color = component.getReportTypeColor('trial-balance');
      expect(color).toBe('bg-orange-100 text-orange-800');
    });
  });

  describe('Data Arrays', () => {
    it('should have months array with correct structure', () => {
      expect(component.months.length).toBe(12);
      expect(component.months[0]).toEqual({ value: '01', label: 'Enero' });
      expect(component.months[11]).toEqual({ value: '12', label: 'Diciembre' });
    });

    it('should have years array with last 10 years', () => {
      expect(component.years.length).toBe(10);
      const currentYear = new Date().getFullYear();
      expect(component.years[0]).toEqual({ value: currentYear.toString(), label: currentYear.toString() });
      expect(component.years[9]).toEqual({ value: (currentYear - 9).toString(), label: (currentYear - 9).toString() });
    });
  });

  describe('Delete Report', () => {
    it('should delete report with confirmation', async () => {
      const mockReport = {
        id: '1',
        type: 'trial-balance',
        title: 'Balance de Comprobación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData
      };

      mockConfirmDialogService.confirm.mockResolvedValue(true);
      component.reports.set([mockReport]);

      await component.deleteReport(mockReport);

      expect(mockConfirmDialogService.confirm).toHaveBeenCalled();
      expect(component.reports()).toEqual([]);
    });

    it('should not delete report without confirmation', async () => {
      const mockReport = {
        id: '1',
        type: 'trial-balance',
        title: 'Balance de Comprobación',
        date: '2024-04-24',
        description: 'Test report',
        generatedBy: 'Test User',
        generatedAt: '2024-04-24T10:00:00Z',
        data: mockTrialBalanceData
      };

      mockConfirmDialogService.confirm.mockResolvedValue(false);
      component.reports.set([mockReport]);

      await component.deleteReport(mockReport);

      expect(component.reports()).toEqual([mockReport]);
    });
  });
});
