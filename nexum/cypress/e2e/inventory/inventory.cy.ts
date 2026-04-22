describe('Inventory Module', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockInventoryApi();

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

  it('should display the inventory table', () => {
    cy.visit('/inventory');

    // Wait for inventory data
    cy.wait('@inventoryRequest');

    // Should display inventory items
    cy.contains('Tornillos 3/8').should('be.visible');
    cy.contains('Cable UTP Cat6').should('be.visible');
    cy.contains('Resma Papel A4').should('be.visible');
  });

  it('should display product codes', () => {
    cy.visit('/inventory');
    cy.wait('@inventoryRequest');

    cy.contains('PROD001').should('be.visible');
    cy.contains('PROD002').should('be.visible');
    cy.contains('PROD003').should('be.visible');
  });

  it('should display stock values', () => {
    cy.visit('/inventory');
    cy.wait('@inventoryRequest');

    // Check stock values are present in the table
    cy.contains('80').should('exist');
    cy.contains('0').should('exist');
    cy.contains('5').should('exist');
  });

  it('should handle empty inventory', () => {
    // Override the mock with empty data
    cy.mockInventoryApi([]);
    cy.visit('/inventory');
    cy.wait('@inventoryRequest');

    // Should show empty state message or no data rows
    cy.get('body').then(($body) => {
      const hasEmptyMessage = $body.text().match(/No hay|Sin datos|vacío|sin resultados/i);
      const hasNoRows = $body.find('table tbody tr').length === 0;
      expect(hasEmptyMessage || hasNoRows).to.be.ok;
    });
  });

  it('should handle API error gracefully', () => {
    // Override mock with error
    cy.intercept('GET', '**/inventory**', {
      statusCode: 500,
      body: { message: 'Internal Server Error' },
    }).as('inventoryError');

    cy.visit('/inventory');
    cy.wait('@inventoryError');

    // Should not crash - page should still be rendered
    cy.url().should('include', '/inventory');
  });
});
