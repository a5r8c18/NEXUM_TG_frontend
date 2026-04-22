describe('Sidebar Navigation', () => {
  beforeEach(() => {
    // Setup mocks
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockInventoryApi();

    // Intercept other common APIs
    cy.intercept('GET', '**/movements**', { statusCode: 200, body: [] }).as('movementsRequest');
    cy.intercept('GET', '**/purchases**', { statusCode: 200, body: [] }).as('purchasesRequest');
    cy.intercept('GET', '**/invoices**', { statusCode: 200, body: { data: [], total: 0 } }).as('invoicesRequest');
    cy.intercept('GET', '**/fixed-assets**', { statusCode: 200, body: [] }).as('fixedAssetsRequest');
    cy.intercept('GET', '**/subscriptions/**', { statusCode: 200, body: { hasAccess: true, plan: 'professional', status: 'active' } }).as('subscriptionRequest');
    cy.intercept('GET', '**/auth/profile', { statusCode: 200, body: { id: 'test', email: 'admin@nexum.com', role: 'admin' } }).as('profileRequest');

    // Login via localStorage for speed
    cy.loginByLocalStorage('admin@nexum.com', 'admin', 'SINGLE_COMPANY');
  });

  it('should display the sidebar with navigation items', () => {
    cy.visit('/dashboard');
    
    // Sidebar should be visible with main sections
    cy.get('aside, nav, [class*="sidebar"]').should('exist');
  });

  it('should navigate to inventory page', () => {
    cy.visit('/dashboard');

    // Click on Inventario/Existencias link
    cy.contains('a, button', /Existencias|Inventario/i).first().click({ force: true });
    cy.url().should('include', '/inventory');
  });

  it('should navigate to dashboard', () => {
    cy.visit('/inventory');
    
    cy.contains('a, button', /Dashboard|Inicio/i).first().click({ force: true });
    cy.url().should('include', '/dashboard');
  });
});
