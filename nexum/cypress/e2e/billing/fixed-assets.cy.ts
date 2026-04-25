describe('Fixed Assets - Activos Fijos', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockFixedAssetsApi();

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

  it('should display the fixed assets page', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Should display page title
    cy.contains('h1, h2', /Activos Fijos|Fixed Assets/i).should('be.visible');
    
    // Should display table headers
    cy.contains('Código').should('be.visible');
    cy.contains('Descripción').should('be.visible');
    cy.contains('Fecha Adquisición').should('be.visible');
    cy.contains('Valor Original').should('be.visible');
    cy.contains('Depreciación Acumulada').should('be.visible');
    cy.contains('Valor Neto').should('be.visible');
  });

  it('should show existing fixed assets', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Should display fixed asset data
    cy.contains('EQ-001').should('be.visible');
    cy.contains('Computadora Portátil').should('be.visible');
    cy.contains('EQ-002').should('be.visible');
    cy.contains('Mueble de Oficina').should('be.visible');
  });

  it('should open create fixed asset modal', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click create button
    cy.contains('button', /Nuevo|Crear|Agregar/i).click();

    // Modal should open
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('h2, h3', /Nuevo Activo Fijo|Crear Activo Fijo/i).should('be.visible');
  });

  it('should create a new fixed asset with valid data', () => {
    cy.intercept('POST', '**/fixed-assets', {
      statusCode: 201,
      body: {
        id: 3,
        code: 'EQ-003',
        description: 'Vehículo Company',
        acquisitionDate: '2024-04-24',
        originalValue: 15000,
        depreciationRate: 0.2,
        usefulLife: 5,
        accumulatedDepreciation: 0,
        netValue: 15000,
        status: 'active'
      }
    }).as('createFixedAssetRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Fill form
    cy.get('#code').type('EQ-003');
    cy.get('#description').type('Vehículo Company');
    cy.get('#acquisitionDate').type('2024-04-24');
    cy.get('#originalValue').type('15000');
    cy.get('#depreciationRate').type('0.2');
    cy.get('#usefulLife').type('5');

    // Save fixed asset
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createFixedAssetRequest');

    // Should show success message
    cy.contains(/Activo fijo creado|Guardado exitosamente/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to save without filling required fields
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation errors
    cy.contains(/Complete todos los campos requeridos|campo requerido/i).should('be.visible');
  });

  it('should validate code uniqueness', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to use existing code
    cy.get('#code').type('EQ-001');
    cy.get('#description').type('Activo Duplicado');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Código ya existe|Duplicado/i).should('be.visible');
  });

  it('should edit an existing fixed asset', () => {
    cy.intercept('PUT', '**/fixed-assets/**', {
      statusCode: 200,
      body: {
        id: 1,
        code: 'EQ-001',
        description: 'Computadora Portátil - Actualizada',
        acquisitionDate: '2024-01-15',
        originalValue: 1200,
        depreciationRate: 0.2,
        usefulLife: 5,
        accumulatedDepreciation: 240,
        netValue: 960,
        status: 'active'
      }
    }).as('updateFixedAssetRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click edit button for first fixed asset
    cy.get('[data-cy="edit-fixed-asset-0"]').click();

    // Modal should open with existing data
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.get('#description').should('have.value', 'Computadora Portátil');

    // Edit description
    cy.get('#description').clear().type('Computadora Portátil - Actualizada');

    // Save changes
    cy.contains('button', /Actualizar|Guardar/i).click();
    cy.wait('@updateFixedAssetRequest');

    // Should show success message
    cy.contains(/Activo fijo actualizado|Guardado exitosamente/i).should('be.visible');
  });

  it('should calculate depreciation correctly', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Should display calculated depreciation
    // For EQ-001: Original 1200, Rate 0.2, 2 years = 1200 * 0.2 * 2 = 480
    cy.contains('480').should('be.visible'); // Accumulated depreciation
    cy.contains('720').should('be.visible'); // Net value (1200 - 480)
  });

  it('should show depreciation catalog', () => {
    cy.intercept('GET', '**/fixed-assets/depreciation-catalog', {
      statusCode: 200,
      body: [
        { groupNumber: 1, description: 'Edificios', depreciationRate: 0.05, usefulLife: 20 },
        { groupNumber: 2, description: 'Maquinaria', depreciationRate: 0.1, usefulLife: 10 },
        { groupNumber: 3, description: 'Equipo de Cómputo', depreciationRate: 0.2, usefulLife: 5 },
        { groupNumber: 4, description: 'Vehículos', depreciationRate: 0.25, usefulLife: 4 }
      ]
    }).as('depreciationCatalogRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click depreciation catalog button
    cy.get('[data-cy="depreciation-catalog"]').click();
    cy.wait('@depreciationCatalogRequest');

    // Should show catalog modal
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('Catálogo de Depreciación').should('be.visible');
    cy.contains('Edificios').should('be.visible');
    cy.contains('Maquinaria').should('be.visible');
    cy.contains('Equipo de Cómputo').should('be.visible');
    cy.contains('Vehículos').should('be.visible');
  });

  it('should dispose a fixed asset', () => {
    cy.intercept('PUT', '**/fixed-assets/**/status', {
      statusCode: 200,
      body: {
        id: 1,
        status: 'disposed',
        disposalDate: new Date().toISOString(),
        disposalValue: 500
      }
    }).as('disposeFixedAssetRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click dispose button
    cy.get('[data-cy="dispose-fixed-asset-0"]').click();

    // Fill disposal form
    cy.get('#disposalDate').type('2024-04-24');
    cy.get('#disposalValue').type('500');

    // Confirm disposal
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@disposeFixedAssetRequest');

    // Should show success message
    cy.contains(/Activo fijo dado de baja|Disposición exitosa/i).should('be.visible');
  });

  it('should filter fixed assets by status', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Filter by active status
    cy.get('[data-cy="status-filter"]').select('active');

    // Should only show active fixed assets
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should search fixed assets by code or description', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Search by description
    cy.get('[data-cy="search-input"]').type('Computadora');

    // Should show filtered results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.contains('Computadora').should('be.visible');
  });

  it('should export fixed assets to Excel', () => {
    cy.intercept('GET', '**/fixed-assets/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=activos-fijos.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('activos-fijos.xlsx').should('exist');
  });

  it('should export fixed assets to PDF', () => {
    cy.intercept('GET', '**/fixed-assets/export/pdf', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=activos-fijos.pdf'
      },
      body: new ArrayBuffer(8) // Mock PDF file
    }).as('exportPdfRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click export PDF button
    cy.get('[data-cy="export-pdf"]').click();
    cy.wait('@exportPdfRequest');

    // Should trigger download
    cy.readFile('activos-fijos.pdf').should('exist');
  });

  it('should handle empty data gracefully', () => {
    // Mock empty fixed assets
    cy.intercept('GET', '**/fixed-assets', {
      statusCode: 200,
      body: []
    }).as('emptyFixedAssetsRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@emptyFixedAssetsRequest');

    // Should show empty state message
    cy.contains(/No hay activos fijos|Sin resultados|No se encontraron activos/i).should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/fixed-assets', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('fixedAssetsError');

    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsError');

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudieron cargar/i).should('be.visible');
  });

  it('should show fixed asset statistics', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Should display statistics
    cy.contains(/Total Activos|Total Assets/i).should('be.visible');
    cy.contains(/Valor Original|Original Value/i).should('be.visible');
    cy.contains(/Depreciación Acumulada|Accumulated Depreciation/i).should('be.visible');
    cy.contains(/Valor Neto|Net Value/i).should('be.visible');
  });

  it('should show depreciation schedule', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Click depreciation schedule button
    cy.get('[data-cy="depreciation-schedule-0"]').click();

    // Should show schedule modal
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('Tabla de Depreciación').should('be.visible');
  });

  it('should validate depreciation rate range', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try invalid rate
    cy.get('#depreciationRate').type('1.5');

    // Try to save
    cy.contains('button', /Guardar|Crear/i').click();

    // Should show validation error
    cy.contains(/Tasa de depreciación inválida|Use un valor entre 0 y 1/i).should('be.visible');
  });

  it('should navigate between billing modules', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Navigate to invoices
    cy.contains('a, button', /Facturas|Invoices/i).click();
    cy.url().should('include', '/billing/invoices');

    // Navigate back to fixed assets
    cy.visit('/billing/fixed-assets');
    cy.url().should('include', '/billing/fixed-assets');
  });

  it('should display asset group information', () => {
    cy.visit('/billing/fixed-assets');
    cy.wait('@fixedAssetsRequest');

    // Should display group column
    cy.contains('Grupo').should('exist');
    cy.contains('Equipo de Cómputo').should('be.visible');
  });

  it('should paginate results', () => {
    // Mock many fixed assets
    const manyFixedAssets = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      code: `EQ-${String(i + 1).padStart(3, '0')}`,
      description: `Activo Fijo ${i + 1}`,
      acquisitionDate: '2024-01-01',
      originalValue: 1000 + i * 100,
      depreciationRate: 0.2,
      usefulLife: 5,
      accumulatedDepreciation: 0,
      netValue: 1000 + i * 100,
      status: 'active'
    }));

    cy.intercept('GET', '**/fixed-assets', {
      statusCode: 200,
      body: { data: manyFixedAssets, total: 50 }
    }).as('manyFixedAssetsRequest');

    cy.visit('/billing/fixed-assets');
    cy.wait('@manyFixedAssetsRequest');

    // Should show pagination controls
    cy.contains(/Siguiente|Next/i).should('be.visible');
    cy.contains(/Anterior|Previous/i).should('be.visible');
  });
});
