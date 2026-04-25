describe('Chart of Accounts - Catálogo de Cuentas', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockAccountsApi();

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

  it('should display the accounts page', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display page title
    cy.contains('h1, h2', /Catálogo de Cuentas|Chart of Accounts/i).should('be.visible');
    
    // Should display table headers
    cy.contains('Código').should('be.visible');
    cy.contains('Nombre').should('be.visible');
    cy.contains('Tipo').should('be.visible');
    cy.contains('Naturaleza').should('be.visible');
    cy.contains('Nivel').should('be.visible');
  });

  it('should show existing accounts', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display account data
    cy.contains('101').should('be.visible');
    cy.contains('Caja').should('be.visible');
    cy.contains('103').should('be.visible');
    cy.contains('Bancos').should('be.visible');
    cy.contains('201').should('be.visible');
    cy.contains('Proveedores').should('be.visible');
  });

  it('should display account types correctly', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display different account types
    cy.contains('asset').should('be.visible');
    cy.contains('liability').should('be.visible');
    cy.contains('equity').should('be.visible');
    cy.contains('income').should('be.visible');
    cy.contains('expense').should('be.visible');
  });

  it('should display account nature correctly', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display account nature
    cy.contains('deudora').should('be.visible');
    cy.contains('acreedora').should('be.visible');
  });

  it('should open create account modal', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Click create button
    cy.contains('button', /Nueva|Crear|Agregar/i).click();

    // Modal should open
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('h2, h3', /Nueva Cuenta|Crear Cuenta/i).should('be.visible');
  });

  it('should create a new account with valid data', () => {
    cy.intercept('POST', '**/accounting/accounts', {
      statusCode: 201,
      body: {
        id: 'new-account-id',
        accountCode: '104',
        accountName: 'Caja Chica',
        nature: 'deudora',
        type: 'asset',
        level: 1,
        parentId: null
      }
    }).as('createAccountRequest');

    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Fill form
    cy.get('#accountCode').type('104');
    cy.get('#accountName').type('Caja Chica');
    cy.get('#nature').select('deudora');
    cy.get('#type').select('asset');

    // Save account
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createAccountRequest');

    // Should show success message
    cy.contains(/Cuenta creada|Guardada exitosamente/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Try to save without filling required fields
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation errors
    cy.contains(/Complete todos los campos requeridos|campo requerido/i).should('be.visible');
  });

  it('should validate account code uniqueness', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Try to use existing account code
    cy.get('#accountCode').type('101');
    cy.get('#accountName').type('Cuenta Duplicada');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Código de cuenta ya existe|Duplicado/i).should('be.visible');
  });

  it('should edit an existing account', () => {
    cy.intercept('PUT', '**/accounting/accounts/**', {
      statusCode: 200,
      body: {
        id: 'edit-account-id',
        accountCode: '101',
        accountName: 'Caja Bancaria',
        nature: 'deudora',
        type: 'asset',
        level: 1,
        parentId: null
      }
    }).as('updateAccountRequest');

    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Click edit button for first account
    cy.get('[data-cy="edit-account-0"]').click();

    // Modal should open with existing data
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.get('#accountName').should('have.value', 'Caja');

    // Edit account name
    cy.get('#accountName').clear().type('Caja Bancaria');

    // Save changes
    cy.contains('button', /Actualizar|Guardar/i).click();
    cy.wait('@updateAccountRequest');

    // Should show success message
    cy.contains(/Cuenta actualizada|Guardada exitosamente/i).should('be.visible');
  });

  it('should create subaccounts', () => {
    cy.intercept('POST', '**/accounting/accounts', {
      statusCode: 201,
      body: {
        id: 'subaccount-id',
        accountCode: '101.1',
        accountName: 'Caja Principal',
        nature: 'deudora',
        type: 'asset',
        level: 2,
        parentId: '101'
      }
    }).as('createSubaccountRequest');

    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Fill form with parent account
    cy.get('#accountCode').type('101.1');
    cy.get('#accountName').type('Caja Principal');
    cy.get('#nature').select('deudora');
    cy.get('#type').select('asset');
    cy.get('#parentId').select('101'); // Caja as parent

    // Save account
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createSubaccountRequest');

    // Should show success message
    cy.contains(/Cuenta creada|Guardada exitosamente/i).should('be.visible');
  });

  it('should show account hierarchy', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display hierarchical structure
    // Parent accounts should be distinguishable from subaccounts
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should filter accounts by type', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Filter by asset type
    cy.get('[data-cy="type-filter"]').select('asset');

    // Should only show asset accounts
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).should('contain', 'asset');
    });
  });

  it('should search accounts by code or name', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Search by account code
    cy.get('[data-cy="search-input"]').type('101');

    // Should show filtered results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.contains('101').should('be.visible');
  });

  it('should export accounts to Excel', () => {
    cy.intercept('GET', '**/accounting/accounts/export/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=catalogo-cuentas.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Click export Excel button
    cy.get('[data-cy="export-excel"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('catalogo-cuentas.xlsx').should('exist');
  });

  it('should handle empty data gracefully', () => {
    // Mock empty accounts
    cy.intercept('GET', '**/accounting/accounts', {
      statusCode: 200,
      body: []
    }).as('emptyAccountsRequest');

    cy.visit('/accounting/accounts');
    cy.wait('@emptyAccountsRequest');

    // Should show empty state message
    cy.contains(/No hay cuentas|Sin resultados|No se encontraron cuentas/i).should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/accounts', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('accountsError');

    cy.visit('/accounting/accounts');
    cy.wait('@accountsError');

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudieron cargar/i).should('be.visible');
  });

  it('should validate account code format', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Try invalid format
    cy.get('#accountCode').type('ABC');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Formato de código inválido|Use solo números/i).should('be.visible');
  });

  it('should show account balance information', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display balance column if available
    cy.contains('Saldo').should('exist');
  });

  it('should navigate to other accounting modules', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Navigate to journal entries
    cy.contains('a, button', /Comprobantes|Asientos/i).click();
    cy.url().should('include', '/accounting');

    // Navigate back to accounts
    cy.visit('/accounting/accounts');
    cy.url().should('include', '/accounting/accounts');
  });

  it('should show account status', () => {
    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Should display active/inactive status
    cy.contains('Activa').should('exist');
    cy.contains('Inactiva').should('exist');
  });

  it('should deactivate an account', () => {
    cy.intercept('PUT', '**/accounting/accounts/**/status', {
      statusCode: 200,
      body: {
        id: 'deactivate-account-id',
        status: 'inactive'
      }
    }).as('deactivateAccountRequest');

    cy.visit('/accounting/accounts');
    cy.wait('@accountsRequest');

    // Click deactivate button
    cy.get('[data-cy="deactivate-account-0"]').click();

    // Confirm deactivation
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@deactivateAccountRequest');

    // Should show success message
    cy.contains(/Cuenta desactivada|Inactivada/i).should('be.visible');
  });
});
