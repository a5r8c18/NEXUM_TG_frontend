describe('Income Statement - Estado de Rendimiento', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockIncomeStatementApi();

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

  it('should display the income statement page', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Should display page title
    cy.contains('h1, h2', /Reportes Contables|Accounting Reports/i).should('be.visible');
    
    // Should show income statement tab
    cy.contains('button, a', /Estado de Rendimiento|Income Statement/i).should('be.visible');
  });

  it('should show income statement data in table', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display table headers
    cy.contains('Tipo').should('be.visible');
    cy.contains('Código').should('be.visible');
    cy.contains('Cuenta').should('be.visible');
    cy.contains('Importe').should('be.visible');

    // Should display sections
    cy.contains('INGRESOS').should('be.visible');
    cy.contains('GASTOS').should('be.visible');
    cy.contains('RESULTADO NETO').should('be.visible');
  });

  it('should display income section correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display income accounts
    cy.contains('401').should('be.visible');
    cy.contains('Ventas').should('be.visible');
    cy.contains('402').should('be.visible');
    cy.contains('Servicios').should('be.visible');
    cy.contains('Total Ingresos').should('be.visible');
  });

  it('should display expense section correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display expense accounts
    cy.contains('501').should('be.visible');
    cy.contains('Costo de Ventas').should('be.visible');
    cy.contains('502').should('be.visible');
    cy.contains('Gastos Administrativos').should('be.visible');
    cy.contains('Total Gastos').should('be.visible');
  });

  it('should calculate net profit correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display net profit (Total Ingresos - Total Gastos)
    // From mock data: 70000 - 45000 = 25000
    cy.contains('RESULTADO NETO').should('be.visible');
    cy.contains('25,000').should('be.visible');
  });

  it('should filter by date range', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Set date range
    cy.get('[data-cy="date-from"]').type('2024-04-01');
    cy.get('[data-cy="date-to"]').type('2024-04-30');

    // Generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show filtered results
    cy.wait('@incomeStatementRequest');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should export income statement to Excel', () => {
    cy.intercept('GET', '**/accounting/reports/income-statement/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=estado-rendimiento.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('estado-rendimiento.xlsx').should('exist');
  });

  it('should export income statement to PDF', () => {
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

  it('should handle empty data gracefully', () => {
    // Mock empty income statement
    cy.intercept('GET', '**/accounting/reports/income-statement', {
      statusCode: 200,
      body: {
        income: { items: [], total: 0 },
        expenses: { items: [], total: 0 },
        netProfit: 0
      }
    }).as('emptyIncomeStatementRequest');

    cy.visit('/accounting/reports');
    cy.wait('@emptyIncomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should show empty state message
    cy.contains(/No hay datos|Sin resultados|No se encontraron datos/i).should('be.visible');
  });

  it('should show loss when expenses exceed income', () => {
    // Mock data with loss
    cy.intercept('GET', '**/accounting/reports/income-statement', {
      statusCode: 200,
      body: {
        income: { items: [], total: 30000 },
        expenses: { items: [], total: 45000 },
        netProfit: -15000
      }
    }).as('lossIncomeStatementRequest');

    cy.visit('/accounting/reports');
    cy.wait('@lossIncomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display loss (negative net profit)
    cy.contains('RESULTADO NETO').should('be.visible');
    cy.contains(/PÉRDIDA|-\d+/i).should('be.visible');
  });

  it('should display account codes and names', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display account codes
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).find('td').eq(1).should('not.be.empty'); // Código column
      cy.wrap($row).find('td').eq(2).should('not.be.empty'); // Cuenta column
    });
  });

  it('should format currency values correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should display formatted currency values
    cy.get('table tbody tr').each(($row) => {
      const amountCell = cy.wrap($row).find('td').eq(3); // Importe column
      amountCell.should('match', /\d+,\d{2}/); // Format like 50,000.00
    });
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/reports/income-statement', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('incomeStatementError');

    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementError');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudo generar/i).should('be.visible');
  });

  it('should validate date range', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Set invalid date range (from > to)
    cy.get('[data-cy="date-from"]').type('2024-04-30');
    cy.get('[data-cy="date-to"]').type('2024-04-01');

    // Try to generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show validation error
    cy.contains(/Fecha desde debe ser menor que fecha hasta|Rango de fechas inválido/i).should('be.visible');
  });

  it('should show Modelo 5921 format option', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should have option for Modelo 5921 format
    cy.contains(/Modelo 5921|Formato SIEN/i).should('be.visible');
  });

  it('should display percentage calculations', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Should show percentages (optional feature)
    cy.contains(/%|porcentaje/i).should('exist');
  });

  it('should navigate between report tabs', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Navigate to expense breakdown
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();
    cy.url().should('include', 'expense-breakdown');

    // Navigate back to income statement
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();
    cy.url().should('include', 'income-statement');
  });

  it('should compare periods if option available', () => {
    cy.visit('/accounting/reports');
    cy.wait('@incomeStatementRequest');

    // Click income statement tab
    cy.contains(/Estado de Rendimiento|Income Statement/i).click();

    // Look for comparison option (if implemented)
    cy.contains(/Comparar períodos|Period comparison/i).should('exist');
  });
});
