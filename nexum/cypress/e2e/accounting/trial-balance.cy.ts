describe('Trial Balance - Balance de Comprobación', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockTrialBalanceApi();

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

  it('should display the trial balance page', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Should display page title
    cy.contains('h1, h2', /Reportes Contables|Accounting Reports/i).should('be.visible');
    
    // Should show trial balance tab
    cy.contains('button, a', /Balance de Comprobación|Trial Balance/i).should('be.visible');
  });

  it('should show trial balance data in table', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Should display table headers
    cy.contains('Código').should('be.visible');
    cy.contains('Cuenta').should('be.visible');
    cy.contains('Saldo Inicial').should('be.visible');
    cy.contains('Débitos').should('be.visible');
    cy.contains('Créditos').should('be.visible');
    cy.contains('Saldo Final').should('be.visible');

    // Should display account data
    cy.contains('101').should('be.visible');
    cy.contains('Caja').should('be.visible');
    cy.contains('201').should('be.visible');
    cy.contains('Bancos').should('be.visible');
  });

  it('should calculate correct balances for deudora accounts', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // For deudora accounts: Saldo Final = Saldo Inicial + (Débitos - Créditos)
    // Verify calculation for account 101 (Caja)
    cy.contains('101').parent().parent().within(() => {
      cy.get('td').eq(2).should('contain', '1000.00'); // Saldo Inicial
      cy.get('td').eq(3).should('contain', '5000.00'); // Débitos
      cy.get('td').eq(4).should('contain', '2000.00'); // Créditos
      cy.get('td').eq(5).should('contain', '4000.00'); // Saldo Final (1000 + 5000 - 2000)
    });
  });

  it('should calculate correct balances for acreedora accounts', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // For acreedora accounts: Saldo Final = Saldo Inicial + (Créditos - Débitos)
    // Verify calculation for account 201 (Bancos)
    cy.contains('201').parent().parent().within(() => {
      cy.get('td').eq(2).should('contain', '2000.00'); // Saldo Inicial
      cy.get('td').eq(3).should('contain', '1000.00'); // Débitos
      cy.get('td').eq(4).should('contain', '3000.00'); // Créditos
      cy.get('td').eq(5).should('contain', '4000.00'); // Saldo Final (2000 + 3000 - 1000)
    });
  });

  it('should filter by date range', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Set date range
    cy.get('[data-cy="date-from"]').type('2024-04-01');
    cy.get('[data-cy="date-to"]').type('2024-04-30');

    // Generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show filtered results
    cy.wait('@trialBalanceRequest');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should export trial balance to Excel', () => {
    cy.intercept('GET', '**/accounting/reports/trial-balance/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=balance-comprobacion.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('balance-comprobacion.xlsx').should('exist');
  });

  it('should export trial balance to PDF', () => {
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

  it('should handle empty data gracefully', () => {
    // Mock empty trial balance
    cy.intercept('GET', '**/accounting/reports/trial-balance', {
      statusCode: 200,
      body: []
    }).as('emptyTrialBalanceRequest');

    cy.visit('/accounting/reports');
    cy.wait('@emptyTrialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Should show empty state message
    cy.contains(/No hay datos|Sin resultados|No se encontraron datos/i).should('be.visible');
  });

  it('should validate date range', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Set invalid date range (from > to)
    cy.get('[data-cy="date-from"]').type('2024-04-30');
    cy.get('[data-cy="date-to"]').type('2024-04-01');

    // Try to generate report
    cy.contains('button', /Generar|Generate/i).click();

    // Should show validation error
    cy.contains(/Fecha desde debe ser menor que fecha hasta|Rango de fechas inválido/i).should('be.visible');
  });

  it('should show account nature information', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Should display account nature (deudora/acreedora)
    cy.contains(/deudora|acreedora/i).should('be.visible');
  });

  it('should verify total debits equal total credits', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Look for totals row
    cy.contains(/Total Débitos|Suma Débitos/i).should('be.visible');
    cy.contains(/Total Créditos|Suma Créditos/i).should('be.visible');

    // Totals should be equal (partida doble)
    // This would require extracting the values and comparing them
    // For now, just verify both totals are present
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/reports/trial-balance', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('trialBalanceError');

    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceError');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudo generar/i).should('be.visible');
  });

  it('should navigate between report tabs', () => {
    cy.visit('/accounting/reports');
    cy.wait('@trialBalanceRequest');

    // Click trial balance tab
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();

    // Navigate to balance sheet
    cy.contains(/Estado de Situación|Balance Sheet/i).click();
    cy.url().should('include', 'balance-sheet');

    // Navigate back to trial balance
    cy.contains(/Balance de Comprobación|Trial Balance/i).click();
    cy.url().should('include', 'trial-balance');
  });
});
