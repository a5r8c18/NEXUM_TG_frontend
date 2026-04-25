describe('Fiscal Years - Años Fiscales', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockFiscalYearsApi();

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

  it('should display the fiscal years page', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Should display page title
    cy.contains('h1, h2', /Años Fiscales|Fiscal Years/i).should('be.visible');
    
    // Should display table headers
    cy.contains('Año').should('be.visible');
    cy.contains('Descripción').should('be.visible');
    cy.contains('Estado').should('be.visible');
    cy.contains('Períodos').should('be.visible');
  });

  it('should show existing fiscal years', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Should display fiscal year data
    cy.contains('2024').should('be.visible');
    cy.contains('2023').should('be.visible');
    cy.contains('Año Fiscal 2024').should('be.visible');
    cy.contains('Año Fiscal 2023').should('be.visible');
  });

  it('should open create fiscal year modal', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click create button
    cy.contains('button', /Nuevo|Crear|Agregar/i).click();

    // Modal should open
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('h2, h3', /Nuevo Año Fiscal|Crear Año Fiscal/i).should('be.visible');
  });

  it('should create a new fiscal year with valid data', () => {
    cy.intercept('POST', '**/accounting/fiscal-years', {
      statusCode: 201,
      body: {
        id: 3,
        year: 2025,
        description: 'Año Fiscal 2025',
        status: 'open',
        periods: []
      }
    }).as('createFiscalYearRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Fill form
    cy.get('#year').type('2025');
    cy.get('#description').type('Año Fiscal 2025');

    // Save fiscal year
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createFiscalYearRequest');

    // Should show success message
    cy.contains(/Año fiscal creado|Guardado exitosamente/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to save without filling required fields
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation errors
    cy.contains(/Complete todos los campos requeridos|campo requerido/i).should('be.visible');
  });

  it('should validate year uniqueness', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to use existing year
    cy.get('#year').type('2024');
    cy.get('#description').type('Año Duplicado');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Año ya existe|Duplicado/i).should('be.visible');
  });

  it('should validate year range', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try invalid year (too old)
    cy.get('#year').type('1990');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Año inválido|Use un año entre 2000 y 2050/i).should('be.visible');
  });

  it('should edit an existing fiscal year', () => {
    cy.intercept('PUT', '**/accounting/fiscal-years/**', {
      statusCode: 200,
      body: {
        id: 1,
        year: 2024,
        description: 'Año Fiscal 2024 - Modificado',
        status: 'open',
        periods: []
      }
    }).as('updateFiscalYearRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click edit button for first fiscal year
    cy.get('[data-cy="edit-fiscal-year-0"]').click();

    // Modal should open with existing data
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.get('#description').should('have.value', 'Año Fiscal 2024');

    // Edit description
    cy.get('#description').clear().type('Año Fiscal 2024 - Modificado');

    // Save changes
    cy.contains('button', /Actualizar|Guardar/i).click();
    cy.wait('@updateFiscalYearRequest');

    // Should show success message
    cy.contains(/Año fiscal actualizado|Guardado exitosamente/i).should('be.visible');
  });

  it('should close a fiscal year', () => {
    cy.intercept('PUT', '**/accounting/fiscal-years/**/status', {
      statusCode: 200,
      body: {
        id: 1,
        status: 'closed',
        closedAt: new Date().toISOString()
      }
    }).as('closeFiscalYearRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click close button
    cy.get('[data-cy="close-fiscal-year-0"]').click();

    // Confirm closure
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@closeFiscalYearRequest');

    // Should show success message
    cy.contains(/Año fiscal cerrado|Cerrado exitosamente/i).should('be.visible');
  });

  it('should reopen a fiscal year', () => {
    cy.intercept('PUT', '**/accounting/fiscal-years/**/status', {
      statusCode: 200,
      body: {
        id: 1,
        status: 'open',
        closedAt: null
      }
    }).as('reopenFiscalYearRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click reopen button for closed fiscal year
    cy.get('[data-cy="reopen-fiscal-year-0"]').click();

    // Confirm reopening
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@reopenFiscalYearRequest');

    // Should show success message
    cy.contains(/Año fiscal reabierto|Reabierto exitosamente/i).should('be.visible');
  });

  it('should display accounting periods', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Should display periods count
    cy.contains('12').should('be.visible'); // 12 months
  });

  it('should view periods for a fiscal year', () => {
    cy.intercept('GET', '**/accounting/fiscal-years/**/periods', {
      statusCode: 200,
      body: [
        { id: 1, year: 2024, month: 1, name: 'Enero 2024', status: 'open' },
        { id: 2, year: 2024, month: 2, name: 'Febrero 2024', status: 'open' },
        { id: 3, year: 2024, month: 3, name: 'Marzo 2024', status: 'closed' }
      ]
    }).as('periodsRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click view periods button
    cy.get('[data-cy="view-periods-0"]').click();
    cy.wait('@periodsRequest');

    // Should show periods modal
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('Períodos Contables').should('be.visible');
    cy.contains('Enero 2024').should('be.visible');
    cy.contains('Febrero 2024').should('be.visible');
    cy.contains('Marzo 2024').should('be.visible');
  });

  it('should close an accounting period', () => {
    cy.intercept('PUT', '**/accounting/periods/**/status', {
      statusCode: 200,
      body: {
        id: 1,
        status: 'closed',
        closedAt: new Date().toISOString()
      }
    }).as('closePeriodRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click view periods
    cy.get('[data-cy="view-periods-0"]').click();
    cy.wait('@periodsRequest');

    // Click close period button
    cy.get('[data-cy="close-period-0"]').click();

    // Confirm closure
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@closePeriodRequest');

    // Should show success message
    cy.contains(/Período cerrado|Cerrado exitosamente/i).should('be.visible');
  });

  it('should prevent closing fiscal year with open periods', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Try to close fiscal year with open periods
    cy.get('[data-cy="close-fiscal-year-0"]').click();

    // Should show warning about open periods
    cy.contains(/No se puede cerrar el año fiscal|Existen períodos abiertos/i).should('be.visible');
  });

  it('should filter fiscal years by status', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Filter by open status
    cy.get('[data-cy="status-filter"]').select('open');

    // Should only show open fiscal years
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should export fiscal years to Excel', () => {
    cy.intercept('GET', '**/accounting/fiscal-years/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=años-fiscales.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('años-fiscales.xlsx').should('exist');
  });

  it('should handle empty data gracefully', () => {
    // Mock empty fiscal years
    cy.intercept('GET', '**/accounting/fiscal-years', {
      statusCode: 200,
      body: []
    }).as('emptyFiscalYearsRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@emptyFiscalYearsRequest');

    // Should show empty state message
    cy.contains(/No hay años fiscales|Sin resultados|No se encontraron años/i).should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/fiscal-years', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('fiscalYearsError');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsError');

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudieron cargar/i).should('be.visible');
  });

  it('should show fiscal year statistics', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Should display statistics
    cy.contains(/Total Años|Total Fiscal Years/i).should('be.visible');
    cy.contains(/Abiertos|Open/i).should('be.visible');
    cy.contains(/Cerrados|Closed/i).should('be.visible');
  });

  it('should navigate to other accounting modules', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Navigate to vouchers
    cy.contains('a, button', /Comprobantes|Asientos/i).click();
    cy.url().should('include', '/accounting');

    // Navigate back to fiscal years
    cy.visit('/accounting/fiscal-years');
    cy.url().should('include', '/accounting/fiscal-years');
  });

  it('should validate period restrictions', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Click view periods
    cy.get('[data-cy="view-periods-0"]').click();
    cy.wait('@periodsRequest');

    // Try to close a period with vouchers
    cy.get('[data-cy="close-period-0"]').click();

    // Should show warning about existing vouchers
    cy.contains(/No se puede cerrar el período|Existen comprobantes/i).should('be.visible');
  });

  it('should show current fiscal year indicator', () => {
    cy.visit('/accounting/fiscal-years');
    cy.wait('@fiscalYearsRequest');

    // Should indicate which is the current fiscal year
    cy.contains(/Actual|Current/i).should('exist');
  });

  it('should paginate results', () => {
    // Mock many fiscal years
    const manyFiscalYears = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      year: 2000 + i,
      description: `Año Fiscal ${2000 + i}`,
      status: i % 2 === 0 ? 'open' : 'closed',
      periods: []
    }));

    cy.intercept('GET', '**/accounting/fiscal-years', {
      statusCode: 200,
      body: { data: manyFiscalYears, total: 50 }
    }).as('manyFiscalYearsRequest');

    cy.visit('/accounting/fiscal-years');
    cy.wait('@manyFiscalYearsRequest');

    // Should show pagination controls
    cy.contains(/Siguiente|Next/i).should('be.visible');
    cy.contains(/Anterior|Previous/i).should('be.visible');
  });
});
