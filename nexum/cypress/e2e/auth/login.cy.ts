describe('Login Flow', () => {
  beforeEach(() => {
    // Clear any stored session
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should display the login page correctly', () => {
    cy.visit('/login');

    // Verify page structure
    cy.contains('h1', 'NEXUM').should('be.visible');
    cy.contains('Sistema de Gestión Empresarial').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.contains('button', 'Iniciar Sesión').should('be.visible');
    cy.contains('Recordarme').should('be.visible');
    cy.contains('Solicitar Acceso').should('be.visible');
  });

  it('should show error for empty credentials', () => {
    cy.visit('/login');

    // Click login without entering credentials
    cy.contains('button', 'Iniciar Sesión').click();

    // Should show error message
    cy.contains('Por favor ingrese email y contraseña').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.mockLoginApi({ success: false });
    cy.visit('/login');

    cy.get('#email').type('wrong@email.com');
    cy.get('#password').type('wrongpassword');
    cy.contains('button', 'Iniciar Sesión').click();

    cy.wait('@loginRequest');
    cy.contains('Credenciales incorrectas').should('be.visible');
  });

  it('should login successfully and redirect to dashboard', () => {
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.visit('/login');

    cy.get('#email').type('admin@nexum.com');
    cy.get('#password').type('1234');
    cy.contains('button', 'Iniciar Sesión').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
  });

  it('should toggle password visibility', () => {
    cy.visit('/login');

    // Password should be hidden by default
    cy.get('#password').should('have.attr', 'type', 'password');

    // Click the toggle button (eye icon)
    cy.get('#password').parent().find('button').click();

    // Password should now be visible
    cy.get('#password').should('have.attr', 'type', 'text');
  });

  it('should navigate to signup page', () => {
    cy.visit('/login');
    cy.contains('Solicitar Acceso').click();
    cy.url().should('include', '/tenant-request');
  });

  it('should navigate back from login', () => {
    cy.visit('/login');
    cy.contains('Volver').click();
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  it('should load companies when email is entered', () => {
    cy.mockCompaniesApi();
    cy.visit('/login');

    cy.get('#email').type('admin@nexum.com');

    // Wait for companies API call
    cy.wait('@companiesRequest');
  });
});
