describe('Journal Entries - Comprobantes Manuales', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockAccountingApi();
    cy.mockAccountsApi();
    cy.mockCostCentersApi();
    cy.mockElementsApi();
    cy.mockSubelementsApi();
    cy.mockVouchersApi();

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

  it('should display the journal entries page', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Should display page title
    cy.contains('h1, h2', /Comprobantes|Asientos Contables|Journal Entries/i).should('be.visible');
    
    // Should display table headers
    cy.contains('Número').should('be.visible');
    cy.contains('Fecha').should('be.visible');
    cy.contains('Descripción').should('be.visible');
    cy.contains('Estado').should('be.visible');
    cy.contains('Total').should('be.visible');
  });

  it('should show existing vouchers', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Should display voucher data
    cy.contains('COP-00001').should('be.visible');
    cy.contains('COP-00002').should('be.visible');
    cy.contains('Comprobante de prueba').should('be.visible');
    cy.contains('draft').should('be.visible');
    cy.contains('posted').should('be.visible');
  });

  it('should open create voucher modal', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Click create button
    cy.contains('button', /Nuevo|Crear|Agregar/i).click();

    // Modal should open
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('h2, h3', /Nuevo Comprobante|Crear Asiento/i).should('be.visible');
  });

  it('should create a new voucher with valid data', () => {
    cy.intercept('POST', '**/accounting/vouchers', {
      statusCode: 201,
      body: {
        id: 'new-voucher-id',
        voucherNumber: 'COP-00003',
        date: '2024-04-24',
        description: 'Comprobante de prueba Cypress',
        status: 'draft',
        totalAmount: 1000,
        lines: []
      }
    }).as('createVoucherRequest');

    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Fill header
    cy.get('#date').type('2024-04-24');
    cy.get('#description').type('Comprobante de prueba Cypress');

    // Add first line
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-code-0"]').type('101');
    cy.wait('@accountsRequest');
    cy.get('[data-cy="account-code-0"]').type('{enter}');
    cy.get('[data-cy="debit-0"]').type('1000');
    cy.get('[data-cy="credit-0"]').should('have.value', '0');

    // Add second line
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-code-1"]').type('201');
    cy.wait('@accountsRequest');
    cy.get('[data-cy="account-code-1"]').type('{enter}');
    cy.get('[data-cy="credit-1"]').type('1000');
    cy.get('[data-cy="debit-1"]').should('have.value', '0');

    // Save voucher
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createVoucherRequest');

    // Should show success message
    cy.contains(/Comprobante creado|Guardado exitosamente/i).should('be.visible');
  });

  it('should validate double entry rule', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Fill header
    cy.get('#date').type('2024-04-24');
    cy.get('#description').type('Comprobante desbalanceado');

    // Add line with only debit
    cy.get('[data-cy="add-line-button"]').click();
    cy.get('[data-cy="account-code-0"]').type('101');
    cy.get('[data-cy="debit-0"]').type('1000');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/débito debe ser igual al crédito|partida doble no cuadra/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Open create modal
    cy.contains('button', /Nuevo|Crear/i).click();

    // Try to save without filling required fields
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation errors
    cy.contains(/Complete todos los campos requeridos|campo requerido/i).should('be.visible');
  });

  it('should edit an existing voucher', () => {
    cy.intercept('PUT', '**/accounting/vouchers/**', {
      statusCode: 200,
      body: {
        id: 'edit-voucher-id',
        voucherNumber: 'COP-00001',
        date: '2024-04-24',
        description: 'Comprobante editado',
        status: 'draft',
        totalAmount: 1000,
        lines: []
      }
    }).as('updateVoucherRequest');

    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Click edit button for first voucher
    cy.get('[data-cy="edit-voucher-0"]').click();

    // Modal should open with existing data
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.get('#description').should('have.value', 'Comprobante de prueba');

    // Edit description
    cy.get('#description').clear().type('Comprobante editado');

    // Save changes
    cy.contains('button', /Actualizar|Guardar/i).click();
    cy.wait('@updateVoucherRequest');

    // Should show success message
    cy.contains(/Comprobante actualizado|Guardado exitosamente/i).should('be.visible');
  });

  it('should post a voucher', () => {
    cy.intercept('PUT', '**/accounting/vouchers/**/status', {
      statusCode: 200,
      body: {
        id: 'post-voucher-id',
        status: 'posted'
      }
    }).as('postVoucherRequest');

    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Click post button for draft voucher
    cy.get('[data-cy="post-voucher-0"]').click();

    // Confirm post
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@postVoucherRequest');

    // Should show success message
    cy.contains(/Comprobante contabilizado|Publicado/i).should('be.visible');
  });

  it('should cancel a voucher', () => {
    cy.intercept('PUT', '**/accounting/vouchers/**/status', {
      statusCode: 200,
      body: {
        id: 'cancel-voucher-id',
        status: 'cancelled'
      }
    }).as('cancelVoucherRequest');

    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Click cancel button for posted voucher
    cy.get('[data-cy="cancel-voucher-1"]').click();

    // Confirm cancellation
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@cancelVoucherRequest');

    // Should show success message
    cy.contains(/Comprobante anulado|Cancelado/i).should('be.visible');
  });

  it('should filter vouchers by status', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Filter by draft status
    cy.get('[data-cy="status-filter"]').select('draft');

    // Should only show draft vouchers
    cy.contains('draft').should('be.visible');
    cy.contains('posted').should('not.exist');
  });

  it('should filter vouchers by date range', () => {
    cy.visit('/accounting');
    cy.wait('@vouchersRequest');

    // Set date range
    cy.get('[data-cy="date-from"]').type('2024-04-01');
    cy.get('[data-cy="date-to"]').type('2024-04-30');

    // Apply filter
    cy.contains('button', /Filtrar|Aplicar/i).click();

    // Should show filtered results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/accounting/vouchers', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('vouchersError');

    cy.visit('/accounting');
    cy.wait('@vouchersError');

    // Should not crash - page should still be rendered
    cy.url().should('include', '/accounting');
    cy.contains(/Error al cargar|Intente nuevamente/i).should('be.visible');
  });
});
