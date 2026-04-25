describe('Exports - Exportación Excel/PDF', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockTrialBalanceApi();
    cy.mockBalanceSheetApi();
    cy.mockIncomeStatementApi();
    cy.mockExpenseBreakdownApi();

    // Mock subscription check
    cy.intercept('GET', '**/subscriptions/**', {
      statusCode: 200,
      body: { hasAccess: true, plan: 'professional', status: 'active' },
    }).as('subscriptionRequest');

    cy.intercept('GET', '**/auth/profile', {
      statusCode: 200,
      body: { id: 'test', email: 'admin@nexum.com', role: 'admin' },
    }).as('profileRequest');

    // Login via localStorage
    cy.loginByLocalStorage('admin@nexum.com', 'admin', 'SINGLE_COMPANY');
  });

  describe('Trial Balance Exports', () => {
    it('should export trial balance to Excel successfully', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportTrialBalanceExcel');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportTrialBalanceExcel');

      // Should trigger download
      cy.readFile('balance-comprobacion.xlsx').should('exist');
    });

    it('should export trial balance to PDF successfully', () => {
      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Click export PDF button
      cy.get('[data-cy="export-pdf"]').click();

      // Should generate PDF (mocked by jsPDF)
      cy.window().then((win) => {
        expect(win.jsPDF).to.exist;
      });
    });

    it('should handle trial balance export errors', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
        statusCode: 500,
        body: { message: 'Export failed' }
      }).as('exportTrialBalanceError');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportTrialBalanceError');

      // Should show error message
      cy.contains(/Error al exportar|Export failed/i).should('be.visible');
    });
  });

  describe('Balance Sheet Exports', () => {
    it('should export balance sheet to Excel successfully', () => {
      cy.intercept('GET', '**/accounting/reports/balance-sheet/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=estado-situacion.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportBalanceSheetExcel');

      cy.visit('/accounting/reports');
      cy.wait('@balanceSheetRequest');

      // Click balance sheet tab
      cy.contains(/Estado de Situación|Balance Sheet/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportBalanceSheetExcel');

      // Should trigger download
      cy.readFile('estado-situacion.xlsx').should('exist');
    });

    it('should export balance sheet to PDF successfully', () => {
      cy.visit('/accounting/reports');
      cy.wait('@balanceSheetRequest');

      // Click balance sheet tab
      cy.contains(/Estado de Situación|Balance Sheet/i).click();

      // Click export PDF button
      cy.get('[data-cy="export-pdf"]').click();

      // Should generate PDF (mocked by jsPDF)
      cy.window().then((win) => {
        expect(win.jsPDF).to.exist;
      });
    });

    it('should include Modelo 5920 format in Excel export', () => {
      cy.intercept('GET', '**/accounting/reports/balance-sheet/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=modelo-5920.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportModelo5920');

      cy.visit('/accounting/reports');
      cy.wait('@balanceSheetRequest');

      // Click balance sheet tab
      cy.contains(/Estado de Situación|Balance Sheet/i).click();

      // Select Modelo 5920 format
      cy.get('[data-cy="format-select"]').select('modelo-5920');

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportModelo5920');

      // Should trigger download with correct filename
      cy.readFile('modelo-5920.xlsx').should('exist');
    });
  });

  describe('Income Statement Exports', () => {
    it('should export income statement to Excel successfully', () => {
      cy.intercept('GET', '**/accounting/reports/income-statement/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=estado-rendimiento.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportIncomeStatementExcel');

      cy.visit('/accounting/reports');
      cy.wait('@incomeStatementRequest');

      // Click income statement tab
      cy.contains(/Estado de Rendimiento|Income Statement/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportIncomeStatementExcel');

      // Should trigger download
      cy.readFile('estado-rendimiento.xlsx').should('exist');
    });

    it('should export income statement to PDF successfully', () => {
      cy.visit('/accounting/reports');
      cy.wait('@incomeStatementRequest');

      // Click income statement tab
      cy.contains(/Estado de Rendimiento|Income Statement/i).click();

      // Click export PDF button
      cy.get('[data-cy="export-pdf"]').click();

      // Should generate PDF (mocked by jsPDF)
      cy.window().then((win) => {
        expect(win.jsPDF).to.exist;
      });
    });

    it('should include Modelo 5921 format in Excel export', () => {
      cy.intercept('GET', '**/accounting/reports/income-statement/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=modelo-5921.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportModelo5921');

      cy.visit('/accounting/reports');
      cy.wait('@incomeStatementRequest');

      // Click income statement tab
      cy.contains(/Estado de Rendimiento|Income Statement/i).click();

      // Select Modelo 5921 format
      cy.get('[data-cy="format-select"]').select('modelo-5921');

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportModelo5921');

      // Should trigger download with correct filename
      cy.readFile('modelo-5921.xlsx').should('exist');
    });
  });

  describe('Expense Breakdown Exports', () => {
    it('should export expense breakdown to Excel successfully', () => {
      cy.intercept('GET', '**/accounting/reports/expense-breakdown/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=gastos-subelementos.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportExpenseBreakdownExcel');

      cy.visit('/accounting/reports');
      cy.wait('@expenseBreakdownRequest');

      // Click expense breakdown tab
      cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportExpenseBreakdownExcel');

      // Should trigger download
      cy.readFile('gastos-subelementos.xlsx').should('exist');
    });

    it('should export expense breakdown to PDF successfully', () => {
      cy.visit('/accounting/reports');
      cy.wait('@expenseBreakdownRequest');

      // Click expense breakdown tab
      cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

      // Click export PDF button
      cy.get('[data-cy="export-pdf"]').click();

      // Should generate PDF (mocked by jsPDF)
      cy.window().then((win) => {
        expect(win.jsPDF).to.exist;
      });
    });

    it('should include Modelo 5924 format in Excel export', () => {
      cy.intercept('GET', '**/accounting/reports/expense-breakdown/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=modelo-5924.xlsx'
        },
        body: new ArrayBuffer(8) // Mock Excel file
      }).as('exportModelo5924');

      cy.visit('/accounting/reports');
      cy.wait('@expenseBreakdownRequest');

      // Click expense breakdown tab
      cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

      // Select Modelo 5924 format
      cy.get('[data-cy="format-select"]').select('modelo-5924');

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportModelo5924');

      // Should trigger download with correct filename
      cy.readFile('modelo-5924.xlsx').should('exist');
    });
  });

  describe('Export Functionality', () => {
    it('should show loading state during export', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
        },
        body: new ArrayBuffer(8),
        delay: 2000 // Simulate slow export
      }).as('slowExport');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();

      // Should show loading state
      cy.get('[data-cy="export-loading"]').should('be.visible');
      cy.contains(/Exportando|Generating/i).should('be.visible');

      // Wait for export to complete
      cy.wait('@slowExport');

      // Loading state should be gone
      cy.get('[data-cy="export-loading"]').should('not.exist');
    });

    it('should disable export buttons during export', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
        },
        body: new ArrayBuffer(8),
        delay: 1000
      }).as('slowExport');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();

      // Export buttons should be disabled
      cy.get('[data-cy="export-excel"]').should('be.disabled');
      cy.get('[data-cy="export-pdf"]').should('be.disabled');

      // Wait for export to complete
      cy.wait('@slowExport');

      // Export buttons should be enabled again
      cy.get('[data-cy="export-excel"]').should('not.be.disabled');
      cy.get('[data-cy="export-pdf"]').should('not.be.disabled');
    });

    it('should validate date range before export', () => {
      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Set invalid date range
      cy.get('[data-cy="date-from"]').type('2024-04-30');
      cy.get('[data-cy="date-to"]').type('2024-04-01');

      // Try to export
      cy.get('[data-cy="export-excel"]').click();

      // Should show validation error
      cy.contains(/Fecha desde debe ser menor que fecha hasta|Rango de fechas inválido/i).should('be.visible');
    });

    it('should show export success notification', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
        },
        body: new ArrayBuffer(8)
      }).as('exportTrialBalanceExcel');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Click export Excel button
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportTrialBalanceExcel');

      // Should show success notification
      cy.contains(/Exportación exitosa|Export successful/i).should('be.visible');
    });

    it('should allow multiple exports in sequence', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
        },
        body: new ArrayBuffer(8)
      }).as('exportTrialBalanceExcel');

      cy.intercept('GET', '**/accounting/reports/trial-balance/export/pdf', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.pdf'
        },
        body: new ArrayBuffer(8)
      }).as('exportTrialBalancePDF');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Export Excel
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportTrialBalanceExcel');

      // Export PDF
      cy.get('[data-cy="export-pdf"]').click();
      cy.wait('@exportTrialBalancePDF');

      // Both exports should succeed
      cy.readFile('balance-comprobacion.xlsx').should('exist');
      cy.readFile('balance-comprobacion.pdf').should('exist');
    });

    it('should preserve filters in export', () => {
      cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel?fromDate=2024-04-01&toDate=2024-04-30', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
        },
        body: new ArrayBuffer(8)
      }).as('exportFilteredTrialBalance');

      cy.visit('/accounting/reports');
      cy.wait('@trialBalanceRequest');

      // Click trial balance tab
      cy.contains(/Balance de Comprobación|Trial Balance/i).click();

      // Set date range
      cy.get('[data-cy="date-from"]').type('2024-04-01');
      cy.get('[data-cy="date-to"]').type('2024-04-30');

      // Generate report
      cy.contains('button', /Generar|Generate/i).click();
      cy.wait('@trialBalanceRequest');

      // Export Excel
      cy.get('[data-cy="export-excel"]').click();
      cy.wait('@exportFilteredTrialBalance');

      // Should trigger download with filtered data
      cy.readFile('balance-comprobacion.xlsx').should('exist');
    });
  });
});
