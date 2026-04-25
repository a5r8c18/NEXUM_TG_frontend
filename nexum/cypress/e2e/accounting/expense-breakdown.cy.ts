describe('Expense Breakdown - Gastos por Subelementos (Modelo 5924)', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
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

  it('should display the expense breakdown page', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Should display page title
    cy.contains('h1, h2', /Reportes Contables|Accounting Reports/i).should('be.visible');
    
    // Should show expense breakdown tab
    cy.contains('button, a', /Gastos por Subelementos|Expense Breakdown/i).should('be.visible');
  });

  it('should show expense breakdown data in table', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should display table headers
    cy.contains('Elemento').should('be.visible');
    cy.contains('Subelemento').should('be.visible');
    cy.contains('Importe').should('be.visible');

    // Should display elements and subelements
    cy.contains('Gastos de Personal').should('be.visible');
    cy.contains('Gastos de Operación').should('be.visible');
    cy.contains('Salarios').should('be.visible');
    cy.contains('Alquiler').should('be.visible');
  });

  it('should display element grouping correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should display element 1: Gastos de Personal
    cy.contains('1').should('be.visible');
    cy.contains('Gastos de Personal').should('be.visible');
    cy.contains('20,000').should('be.visible'); // Total for element 1

    // Should display element 2: Gastos de Operación
    cy.contains('2').should('be.visible');
    cy.contains('Gastos de Operación').should('be.visible');
    cy.contains('10,000').should('be.visible'); // Total for element 2
  });

  it('should display subelement details correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should display subelements under Gastos de Personal
    cy.contains('1.1').should('be.visible');
    cy.contains('Salarios').should('be.visible');
    cy.contains('15,000').should('be.visible');

    cy.contains('1.2').should('be.visible');
    cy.contains('Seguridad Social').should('be.visible');
    cy.contains('5,000').should('be.visible');

    // Should display subelements under Gastos de Operación
    cy.contains('2.1').should('be.visible');
    cy.contains('Alquiler').should('be.visible');
    cy.contains('6,000').should('be.visible');

    cy.contains('2.2').should('be.visible');
    cy.contains('Servicios').should('be.visible');
    cy.contains('4,000').should('be.visible');
  });

  it('should calculate grand total correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should display grand total (20,000 + 10,000 = 30,000)
    cy.contains(/Total General|Gran Total/i).should('be.visible');
    cy.contains('30,000').should('be.visible');
  });

  it('should filter by date range', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Set date range
    cy.get('[data-cy="date-from"]').type('2024-04-01');
    cy.get('[data-cy="date-to"]').type('2024-04-30');

    // Generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show filtered results
    cy.wait('@expenseBreakdownRequest');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should export expense breakdown to Excel', () => {
    cy.intercept('GET', '**/accounting/reports/expense-breakdown/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=gastos-subelementos.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('gastos-subelementos.xlsx').should('exist');
  });

  it('should export expense breakdown to PDF', () => {
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

  it('should handle empty data gracefully', () => {
    // Mock empty expense breakdown
    cy.intercept('GET', '**/accounting/reports/expense-breakdown', {
      statusCode: 200,
      body: {
        elements: [],
        grandTotal: 0
      }
    }).as('emptyExpenseBreakdownRequest');

    cy.visit('/accounting/reports');
    cy.wait('@emptyExpenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should show empty state message
    cy.contains(/No hay datos|Sin resultados|No se encontraron datos/i).should('be.visible');
  });

  it('should show Modelo 5924 format option', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should have option for Modelo 5924 format
    cy.contains(/Modelo 5924|Formato SIEN/i).should('be.visible');
  });

  it('should display element codes and names', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should display element codes
    cy.get('table tbody tr').each(($row) => {
      const cells = cy.wrap($row).find('td');
      // First cell should have element code (1, 1.1, 1.2, 2, 2.1, 2.2)
      cells.eq(0).should('not.be.empty');
      // Second cell should have element/subelement name
      cells.eq(1).should('not.be.empty');
    });
  });

  it('should format currency values correctly', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should display formatted currency values
    cy.get('table tbody tr').each(($row) => {
      const amountCell = cy.wrap($row).find('td').eq(2); // Importe column
      amountCell.should('match', /\d+,\d{2}/); // Format like 15,000.00
    });
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/reports/expense-breakdown', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('expenseBreakdownError');

    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownError');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudo generar/i).should('be.visible');
  });

  it('should validate date range', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Set invalid date range (from > to)
    cy.get('[data-cy="date-from"]').type('2024-04-30');
    cy.get('[data-cy="date-to"]').type('2024-04-01');

    // Try to generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show validation error
    cy.contains(/Fecha desde debe ser menor que fecha hasta|Rango de fechas inválido/i).should('be.visible');
  });

  it('should show hierarchical structure', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should show hierarchical structure (elements with subelements)
    // Elements should be distinguishable from subelements (bold, different style, etc.)
    cy.get('table tbody tr').should('have.length', 7); // 2 element headers + 5 subelements + totals
  });

  it('should display only expense accounts', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should only show expense-type accounts (5xx series)
    cy.get('table tbody tr').each(($row) => {
      const text = cy.wrap($row).text();
      // Should contain expense-related terms
      expect(text).to.match(/Gastos|Personal|Operación|Salarios|Seguridad|Alquiler|Servicios/);
    });
  });

  it('should navigate between report tabs', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Navigate to trial balance
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();
    cy.url().should('include', 'trial-balance');

    // Navigate back to expense breakdown
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();
    cy.url().should('include', 'expense-breakdown');
  });

  it('should show element totals', () => {
    cy.visit('/accounting/reports');
    cy.wait('@expenseBreakdownRequest');

    // Click expense breakdown tab
    cy.contains(/Gastos por Subelementos|Expense Breakdown/i).click();

    // Should show totals for each element
    // Element 1 total: 15,000 + 5,000 = 20,000
    cy.contains('Gastos de Personal').parent().contains('20,000').should('be.visible');
    
    // Element 2 total: 6,000 + 4,000 = 10,000
    cy.contains('Gastos de Operación').parent().contains('10,000').should('be.visible');
  });
});
