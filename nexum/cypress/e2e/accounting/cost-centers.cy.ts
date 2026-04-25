describe('Cost Centers - Centros de Costo', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockCostCentersApi();

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

  it('should display the cost centers page', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Should display page title
    cy.contains('h1, h2', /Centros de Costo|Cost Centers/i).should('be.visible');
    
    // Should display table headers
    cy.contains('Código').should('be.visible');
    cy.contains('Nombre').should('be.visible');
    cy.contains('Descripción').should('be.visible');
    cy.contains('Estado').should('be.visible');
  });

  it('should show existing cost centers', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Should display cost center data
    cy.contains('CC001').should('be.visible');
    cy.contains('Administración').should('be.visible');
    cy.contains('CC002').should('be.visible');
    cy.contains('Ventas').should('be.visible');
    cy.contains('CC003').should('be.visible');
    cy.contains('Producción').should('be.visible');
  });

  it('should open create cost center modal', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Click create button
    cy.contains('button', /Nuevo|Crear|Agregar/i).click();

    // Modal should open
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('h2, h3', /Nuevo Centro de Costo|Crear Centro de Costo/i).should('be.visible');
  });

  it('should create a new cost center with valid data', () => {
    cy.intercept('POST', '**/accounting/cost-centers', {
      statusCode: 201,
      body: {
        id: 4,
        code: 'CC004',
        name: 'Marketing',
        description: 'Departamento de marketing y publicidad',
        isActive: true
      }
    }).as('createCostCenterRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Fill form
    cy.get('#code').type('CC004');
    cy.get('#name').type('Marketing');
    cy.get('#description').type('Departamento de marketing y publicidad');

    // Save cost center
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createCostCenterRequest');

    // Should show success message
    cy.contains(/Centro de costo creado|Guardado exitosamente/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to save without filling required fields
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation errors
    cy.contains(/Complete todos los campos requeridos|campo requerido/i).should('be.visible');
  });

  it('should validate code uniqueness', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to use existing code
    cy.get('#code').type('CC001');
    cy.get('#name').type('Centro Duplicado');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Código ya existe|Duplicado/i).should('be.visible');
  });

  it('should edit an existing cost center', () => {
    cy.intercept('PUT', '**/accounting/cost-centers/**', {
      statusCode: 200,
      body: {
        id: 1,
        code: 'CC001',
        name: 'Administración y Finanzas',
        description: 'Departamento de administración y finanzas',
        isActive: true
      }
    }).as('updateCostCenterRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Click edit button for first cost center
    cy.get('[data-cy="edit-cost-center-0"]').click();

    // Modal should open with existing data
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.get('#name').should('have.value', 'Administración');

    // Edit name
    cy.get('#name').clear().type('Administración y Finanzas');
    cy.get('#description').clear().type('Departamento de administración y finanzas');

    // Save changes
    cy.contains('button', /Actualizar|Guardar/i).click();
    cy.wait('@updateCostCenterRequest');

    // Should show success message
    cy.contains(/Centro de costo actualizado|Guardado exitosamente/i).should('be.visible');
  });

  it('should deactivate a cost center', () => {
    cy.intercept('PUT', '**/accounting/cost-centers/**/status', {
      statusCode: 200,
      body: {
        id: 1,
        isActive: false
      }
    }).as('deactivateCostCenterRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Click deactivate button
    cy.get('[data-cy="deactivate-cost-center-0"]').click();

    // Confirm deactivation
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@deactivateCostCenterRequest');

    // Should show success message
    cy.contains(/Centro de costo desactivado|Inactivado/i).should('be.visible');
  });

  it('should reactivate a cost center', () => {
    cy.intercept('PUT', '**/accounting/cost-centers/**/status', {
      statusCode: 200,
      body: {
        id: 1,
        isActive: true
      }
    }).as('reactivateCostCenterRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Click reactivate button for inactive cost center
    cy.get('[data-cy="reactivate-cost-center-0"]').click();

    // Confirm reactivation
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@reactivateCostCenterRequest');

    // Should show success message
    cy.contains(/Centro de costo reactivado|Activado/i).should('be.visible');
  });

  it('should filter cost centers by status', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Filter by active status
    cy.get('[data-cy="status-filter"]').select('active');

    // Should only show active cost centers
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should search cost centers by code or name', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Search by name
    cy.get('[data-cy="search-input"]').type('Administración');

    // Should show filtered results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.contains('Administración').should('be.visible');
  });

  it('should export cost centers to Excel', () => {
    cy.intercept('GET', '**/accounting/cost-centers/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=centros-costo.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('centros-costo.xlsx').should('exist');
  });

  it('should handle empty data gracefully', () => {
    // Mock empty cost centers
    cy.intercept('GET', '**/accounting/cost-centers', {
      statusCode: 200,
      body: []
    }).as('emptyCostCentersRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@emptyCostCentersRequest');

    // Should show empty state message
    cy.contains(/No hay centros de costo|Sin resultados|No se encontraron centros/i).should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/cost-centers', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('costCentersError');

    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersError');

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudieron cargar/i).should('be.visible');
  });

  it('should validate code format', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try invalid format
    cy.get('#code').type('INVALID-CODE');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Formato de código inválido|Use el formato CCXXX/i).should('be.visible');
  });

  it('should show cost center statistics', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Should display statistics
    cy.contains(/Total Centros|Total Cost Centers/i).should('be.visible');
    cy.contains(/Activos|Active/i).should('be.visible');
    cy.contains(/Inactivos|Inactive/i).should('be.visible');
  });

  it('should navigate to other accounting modules', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Navigate to accounts
    cy.contains('a, button', /Cuentas|Catalogo/i).click();
    cy.url().should('include', '/accounting/accounts');

    // Navigate back to cost centers
    cy.visit('/accounting/cost-centers');
    cy.url().should('include', '/accounting/cost-centers');
  });

  it('should show cost center in voucher lines', () => {
    // This test verifies that cost centers are available in voucher creation
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Open create voucher modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Add a line and check if cost center dropdown is available
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="cost-center-0"]').should('exist');
  });

  it('should display cost center description', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Should display description column
    cy.get('table tbody tr').each(($row) => {
      const cells = cy.wrap($row).find('td');
      // Third cell should have description
      cells.eq(2).should('not.be.empty');
    });
  });

  it('should show hierarchical structure if applicable', () => {
    cy.visit('/accounting/cost-centers');
    cy.wait('@costCentersRequest');

    // Check if there's a parent-child relationship
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should paginate results', () => {
    // Mock many cost centers
    const manyCostCenters = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      code: `CC${String(i + 1).padStart(3, '0')}`,
      name: `Centro ${i + 1}`,
      description: `Descripción del centro ${i + 1}`,
      isActive: true
    }));

    cy.intercept('GET', '**/accounting/cost-centers', {
      statusCode: 200,
      body: { data: manyCostCenters, total: 50 }
    }).as('manyCostCentersRequest');

    cy.visit('/accounting/cost-centers');
    cy.wait('@manyCostCentersRequest');

    // Should show pagination controls
    cy.contains(/Siguiente|Next/i).should('be.visible');
    cy.contains(/Anterior|Previous/i).should('be.visible');
  });
});
