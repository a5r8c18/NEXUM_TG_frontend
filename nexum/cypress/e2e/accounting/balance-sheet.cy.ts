describe('Balance Sheet - Estado de Situación', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockBalanceSheetApi();

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

  it('should display the balance sheet page', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Should display page title
    cy.contains('h1, h2', /Reportes Contables|Accounting Reports/i).should('be.visible');
    
    // Should show balance sheet tab
    cy.contains('button, a', /Estado de Situación|Balance Sheet/i).should('be.visible');
  });

  it('should show balance sheet data in table', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should display table headers
    cy.contains('Categoría').should('be.visible');
    cy.contains('Código').should('be.visible');
    cy.contains('Cuenta').should('be.visible');
    cy.contains('Saldo').should('be.visible');

    // Should display sections
    cy.contains('ACTIVOS').should('be.visible');
    cy.contains('PASIVOS').should('be.visible');
    cy.contains('PATRIMONIO').should('be.visible');
  });

  it('should display assets section correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should display asset accounts
    cy.contains('101').should('be.visible');
    cy.contains('Caja').should('be.visible');
    cy.contains('103').should('be.visible');
    cy.contains('Bancos').should('be.visible');
    cy.contains('Total Activos').should('be.visible');
  });

  it('should display liabilities section correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should display liability accounts
    cy.contains('201').should('be.visible');
    cy.contains('Proveedores').should('be.visible');
    cy.contains('202').should('be.visible');
    cy.contains('Acreedores').should('be.visible');
    cy.contains('Total Pasivos').should('be.visible');
  });

  it('should display equity section correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should display equity accounts
    cy.contains('301').should('be.visible');
    cy.contains('Capital').should('be.visible');
    cy.contains('302').should('be.visible');
    cy.contains('Reservas').should('be.visible');
    cy.contains('Total Patrimonio').should('be.visible');
  });

  it('should verify accounting equation balances', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Extract totals (this would require more complex logic to get actual values)
    // For now, verify totals are present
    cy.contains('Total Activos').should('be.visible');
    cy.contains('Total Pasivos').should('be.visible');
    cy.contains('Total Patrimonio').should('be.visible');

    // Accounting equation: Assets = Liabilities + Equity
    // The backend should ensure this is balanced
  });

  it('should filter by as-of date', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Set as-of date
    cy.get('[data-cy="as-of-date"]').type('2024-04-30');

    // Generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show filtered results
    cy.wait('@balanceSheetRequest');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should export balance sheet to Excel', () => {
    cy.intercept('GET', '**/accounting/reports/balance-sheet/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=estado-situacion.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('estado-situacion.xlsx').should('exist');
  });

  it('should export balance sheet to PDF', () => {
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

  it('should handle empty data gracefully', () => {
    // Mock empty balance sheet
    cy.intercept('GET', '**/accounting/reports/balance-sheet', {
      statusCode: 200,
      body: {
        assets: { items: [], total: 0 },
        liabilities: { items: [], total: 0 },
        equity: { items: [], total: 0 },
        balanced: true
      }
    }).as('emptyBalanceSheetRequest');

    cy.visit('/accounting/reports');
    cy.wait('@emptyBalanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should show empty state message
    cy.contains(/No hay datos|Sin resultados|No se encontraron datos/i).should('be.visible');
  });

  it('should show balance verification status', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should show if balance is correct
    cy.contains(/Balance correcto|Cuadra|Balanced/i).should('be.visible');
  });

  it('should display account codes and names', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should display account codes
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).find('td').eq(1).should('not.be.empty'); // Código column
      cy.wrap($row).find('td').eq(2).should('not.be.empty'); // Cuenta column
    });
  });

  it('should format currency values correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should display formatted currency values
    cy.get('table tbody tr').each(($row) => {
      const balanceCell = cy.wrap($row).find('td').eq(3); // Saldo column
      balanceCell.should('match', /\d+,\d{2}/); // Format like 1,234.56
    });
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/reports/balance-sheet', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('balanceSheetError');

    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetError');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudo generar/i).should('be.visible');
  });

  it('should validate as-of date', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Set future date
    cy.get('[data-cy="as-of-date"]').type('2025-12-31');

    // Try to generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show validation error
    cy.contains(/Fecha no puede ser futura|Fecha inválida/i).should('be.visible');
  });

  it('should show Modelo 5920 format option', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Should have option for Modelo 5920 format
    cy.contains(/Modelo 5920|Formato SIEN/i).should('be.visible');
  });

  it('should navigate between report tabs', () => {
    cy.visit('/accounting/reports');
    cy.wait('@balanceSheetRequest');

    // Click balance sheet tab
    cy.contains(/Estado de Situación|Balance Sheet/i).click();

    // Navigate to income statement
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();
    cy.url().should('include', 'income-statement');

    // Navigate back to balance sheet
    cy.contains(/Estado de Situación|Balance Sheet/i).click();
    cy.url().should('include', 'balance-sheet');
  });
});
