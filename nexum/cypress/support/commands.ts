// ***********************************************
// Custom Cypress Commands for NEXUM TG
// ***********************************************

declare namespace Cypress {
  interface Chainable {
    /**
     * Login with email and password via the UI login form.
     * @param email - User email
     * @param password - User password
     */
    login(email: string, password: string): Chainable<void>;

    /**
     * Login by setting localStorage directly (faster, bypasses UI).
     * @param email - User email
     * @param role - User role
     * @param tenantType - SINGLE_COMPANY or MULTI_COMPANY
     */
    loginByLocalStorage(
      email: string,
      role?: string,
      tenantType?: string
    ): Chainable<void>;

    /**
     * Logout current user.
     */
    logout(): Chainable<void>;

    /**
     * Intercept and mock the login API call.
     * @param options - Response override options
     */
    mockLoginApi(options?: {
      email?: string;
      role?: string;
      tenantType?: string;
      companyId?: number;
      success?: boolean;
    }): Chainable<void>;

    /**
     * Intercept and mock the companies API call.
     * @param companies - Array of company objects
     */
    mockCompaniesApi(companies?: any[]): Chainable<void>;

    /**
     * Intercept and mock the inventory API call.
     * @param items - Array of inventory items
     */
    mockInventoryApi(items?: any[]): Chainable<void>;
  }
}

// ==========================================
// Login via UI form
// ==========================================
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('#email').clear().type(email);
  cy.get('#password').clear().type(password);
  // Click the login button (the one that says "Iniciar Sesión")
  cy.contains('button', /Iniciar Sesión|Ingresar/).click();
});

// ==========================================
// Login by setting localStorage directly
// ==========================================
Cypress.Commands.add(
  'loginByLocalStorage',
  (
    email: string,
    role: string = 'admin',
    tenantType: string = 'SINGLE_COMPANY'
  ) => {
    const mockUser = {
      id: 'test-user-id',
      email,
      firstName: 'Test',
      lastName: 'User',
      role,
      tenantId: 'tenant-1',
      tenantName: 'Test Tenant',
      tenantType,
    };

    const mockToken = 'cypress-test-jwt-token-' + Date.now();

    window.localStorage.setItem('accessToken', mockToken);
    window.localStorage.setItem('currentUser', JSON.stringify(mockUser));
    window.localStorage.setItem('isAuthenticated', 'true');

    // Set company context for guards
    if (tenantType === 'SINGLE_COMPANY') {
      window.localStorage.setItem(
        'selectedCompany',
        JSON.stringify({ id: '1', name: 'Empresa Demo S.A.' })
      );
    }
  }
);

// ==========================================
// Logout
// ==========================================
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('currentUser');
  window.localStorage.removeItem('isAuthenticated');
  window.localStorage.removeItem('selectedCompany');
  cy.visit('/login');
});

// ==========================================
// Mock Login API
// ==========================================
Cypress.Commands.add('mockLoginApi', (options = {}) => {
  const {
    email = 'admin@nexum.com',
    role = 'admin',
    tenantType = 'SINGLE_COMPANY',
    companyId = 1,
    success = true,
  } = options;

  if (success) {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        accessToken: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        user: {
          id: 'test-user-id',
          email,
          firstName: 'Test',
          lastName: 'User',
          role,
          tenantId: 'tenant-1',
          tenantName: 'Test Tenant',
          tenantType,
          companyId,
        },
      },
    }).as('loginRequest');
  } else {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid credentials' },
    }).as('loginRequest');
  }
});

// ==========================================
// Mock Companies API
// ==========================================
Cypress.Commands.add('mockCompaniesApi', (companies?: any[]) => {
  const defaultCompanies = [
    {
      id: 1,
      name: 'Empresa Demo S.A.',
      tax_id: '222222222',
      address: 'Avenida Secundaria 2',
      phone: '0987654321',
      email: 'demo@empresa.com',
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Teneduria Garcia',
      tax_id: '111111111',
      address: 'Calle Principal 1',
      phone: '1234567890',
      email: 'info@teneduriagarcia.com',
      is_active: true,
      created_at: '2023-01-01T00:00:00.000Z',
    },
  ];

  cy.intercept('GET', '**/companies**', {
    statusCode: 200,
    body: companies || defaultCompanies,
  }).as('companiesRequest');
});

// ==========================================
// Mock Inventory API
// ==========================================
Cypress.Commands.add('mockInventoryApi', (items?: any[]) => {
  const defaultItems = [
    {
      id: 1,
      productCode: 'PROD001',
      productName: 'Tornillos 3/8',
      productDescription: 'Tornillos galvanizados 3/8 pulgada',
      productUnit: 'units',
      entries: 100,
      exits: 20,
      stock: 80,
      stockLimit: 10,
      unitPrice: 0.5,
      warehouse: 'Almacen A',
      entity: 'Empresa Demo',
    },
    {
      id: 2,
      productCode: 'PROD002',
      productName: 'Cable UTP Cat6',
      productDescription: 'Cable de red categoría 6',
      productUnit: 'metros',
      entries: 50,
      exits: 50,
      stock: 0,
      stockLimit: 5,
      unitPrice: 15.0,
      warehouse: 'Almacen B',
      entity: 'Empresa Demo',
    },
    {
      id: 3,
      productCode: 'PROD003',
      productName: 'Resma Papel A4',
      productDescription: 'Papel bond tamaño carta',
      productUnit: 'resmas',
      entries: 200,
      exits: 195,
      stock: 5,
      stockLimit: 20,
      unitPrice: 8.5,
      warehouse: 'Almacen A',
      entity: 'Empresa Demo',
    },
  ];

  cy.intercept('GET', '**/inventory**', {
    statusCode: 200,
    body: { inventory: items || defaultItems },
  }).as('inventoryRequest');
});
