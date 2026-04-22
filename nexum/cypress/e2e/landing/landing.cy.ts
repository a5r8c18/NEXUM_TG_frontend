describe('Landing Page', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display the landing page', () => {
    cy.visit('/');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  it('should have a link to login', () => {
    cy.visit('/');
    // Look for any login link/button
    cy.contains(/Iniciar Sesión|Login|Ingresar/i).should('exist');
  });

  it('should redirect unauthenticated users from protected routes to login', () => {
    cy.visit('/dashboard');
    // Should be redirected to login or landing
    cy.url().should('not.include', '/dashboard');
  });

  it('should redirect unauthenticated users from inventory to login', () => {
    cy.visit('/inventory');
    cy.url().should('not.include', '/inventory');
  });
});
