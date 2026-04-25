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

    /**
     * Intercept and mock the accounting APIs.
     */
    mockAccountingApi(): Chainable<void>;

    /**
     * Intercept and mock the trial balance API.
     * @param data - Trial balance data
     */
    mockTrialBalanceApi(data?: any[]): Chainable<void>;

    /**
     * Intercept and mock the balance sheet API.
     * @param data - Balance sheet data
     */
    mockBalanceSheetApi(data?: any): Chainable<void>;

    /**
     * Intercept and mock the income statement API.
     * @param data - Income statement data
     */
    mockIncomeStatementApi(data?: any): Chainable<void>;

    /**
     * Intercept and mock the expense breakdown API.
     * @param data - Expense breakdown data
     */
    mockExpenseBreakdownApi(data?: any): Chainable<void>;

    /**
     * Intercept and mock the accounts API.
     * @param accounts - Array of accounts
     */
    mockAccountsApi(accounts?: any[]): Chainable<void>;

    /**
     * Intercept and mock the cost centers API.
     * @param costCenters - Array of cost centers
     */
    mockCostCentersApi(costCenters?: any[]): Chainable<void>;

    /**
     * Intercept and mock the elements API.
     * @param elements - Array of elements
     */
    mockElementsApi(elements?: any[]): Chainable<void>;

    /**
     * Intercept and mock the subelements API.
     * @param subelements - Array of subelements
     */
    mockSubelementsApi(subelements?: any[]): Chainable<void>;

    /**
     * Intercept and mock the vouchers API.
     * @param vouchers - Array of vouchers
     */
    mockVouchersApi(vouchers?: any[]): Chainable<void>;

    /**
     * Intercept and mock the invoices API.
     * @param invoices - Array of invoices
     */
    mockInvoicesApi(invoices?: any[]): Chainable<void>;

    /**
     * Intercept and mock the customers API.
     * @param customers - Array of customers
     */
    mockCustomersApi(customers?: any[]): Chainable<void>;

    /**
     * Intercept and mock the fiscal years API.
     * @param fiscalYears - Array of fiscal years
     */
    mockFiscalYearsApi(fiscalYears?: any[]): Chainable<void>;

    /**
     * Intercept and mock the fixed assets API.
     * @param fixedAssets - Array of fixed assets
     */
    mockFixedAssetsApi(fixedAssets?: any[]): Chainable<void>;
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

// ==========================================
// Mock Accounting APIs
// ==========================================
Cypress.Commands.add('mockAccountingApi', () => {
  // Generic accounting API interceptor
  cy.intercept('GET', '**/accounting/**', (req) => {
    // Let specific mock commands handle their own endpoints
    req.continue();
  });
});

// ==========================================
// Mock Trial Balance API
// ==========================================
Cypress.Commands.add('mockTrialBalanceApi', (data?: any[]) => {
  const defaultData = [
    {
      accountCode: '101',
      accountName: 'Caja',
      nature: 'deudora',
      accountType: 'asset',
      openingBalance: 1000,
      periodDebit: 5000,
      periodCredit: 2000,
      closingBalance: 4000
    },
    {
      accountCode: '201',
      accountName: 'Bancos',
      nature: 'acreedora',
      accountType: 'liability',
      openingBalance: 2000,
      periodDebit: 1000,
      periodCredit: 3000,
      closingBalance: 4000
    }
  ];

  cy.intercept('GET', '**/accounting/reports/trial-balance**', {
    statusCode: 200,
    body: data || defaultData,
  }).as('trialBalanceRequest');
});

// ==========================================
// Mock Balance Sheet API
// ==========================================
Cypress.Commands.add('mockBalanceSheetApi', (data?: any) => {
  const defaultData = {
    assets: {
      items: [
        { accountCode: '101', accountName: 'Caja', balance: 4000 },
        { accountCode: '103', accountName: 'Bancos', balance: 15000 }
      ],
      total: 19000
    },
    liabilities: {
      items: [
        { accountCode: '201', accountName: 'Proveedores', balance: 8000 },
        { accountCode: '202', accountName: 'Acreedores', balance: 3000 }
      ],
      total: 11000
    },
    equity: {
      items: [
        { accountCode: '301', accountName: 'Capital', balance: 5000 },
        { accountCode: '302', accountName: 'Reservas', balance: 3000 }
      ],
      total: 8000
    },
    balanced: true
  };

  cy.intercept('GET', '**/accounting/reports/balance-sheet**', {
    statusCode: 200,
    body: data || defaultData,
  }).as('balanceSheetRequest');
});

// ==========================================
// Mock Income Statement API
// ==========================================
Cypress.Commands.add('mockIncomeStatementApi', (data?: any) => {
  const defaultData = {
    income: {
      items: [
        { accountCode: '401', accountName: 'Ventas', totalDebit: 0, totalCredit: 50000 },
        { accountCode: '402', accountName: 'Servicios', totalDebit: 0, totalCredit: 20000 }
      ],
      total: 70000
    },
    expenses: {
      items: [
        { accountCode: '501', accountName: 'Costo de Ventas', totalDebit: 30000, totalCredit: 0 },
        { accountCode: '502', accountName: 'Gastos Administrativos', totalDebit: 15000, totalCredit: 0 }
      ],
      total: 45000
    },
    netProfit: 25000
  };

  cy.intercept('GET', '**/accounting/reports/income-statement**', {
    statusCode: 200,
    body: data || defaultData,
  }).as('incomeStatementRequest');
});

// ==========================================
// Mock Expense Breakdown API
// ==========================================
Cypress.Commands.add('mockExpenseBreakdownApi', (data?: any) => {
  const defaultData = {
    elements: [
      {
        elementCode: '1',
        elementName: 'Gastos de Personal',
        total: 20000,
        subelements: [
          { subelementCode: '1.1', subelementName: 'Salarios', total: 15000 },
          { subelementCode: '1.2', subelementName: 'Seguridad Social', total: 5000 }
        ]
      },
      {
        elementCode: '2',
        elementName: 'Gastos de Operación',
        total: 10000,
        subelements: [
          { subelementCode: '2.1', subelementName: 'Alquiler', total: 6000 },
          { subelementCode: '2.2', subelementName: 'Servicios', total: 4000 }
        ]
      }
    ],
    grandTotal: 30000
  };

  cy.intercept('GET', '**/accounting/reports/expense-breakdown**', {
    statusCode: 200,
    body: data || defaultData,
  }).as('expenseBreakdownRequest');
});

// ==========================================
// Mock Accounts API
// ==========================================
Cypress.Commands.add('mockAccountsApi', (accounts?: any[]) => {
  const defaultAccounts = [
    { accountCode: '101', accountName: 'Caja', nature: 'deudora', type: 'asset' },
    { accountCode: '103', accountName: 'Bancos', nature: 'deudora', type: 'asset' },
    { accountCode: '201', accountName: 'Proveedores', nature: 'acreedora', type: 'liability' },
    { accountCode: '301', accountName: 'Capital', nature: 'acreedora', type: 'equity' }
  ];

  cy.intercept('GET', '**/accounting/accounts**', {
    statusCode: 200,
    body: accounts || defaultAccounts,
  }).as('accountsRequest');
});

// ==========================================
// Mock Cost Centers API
// ==========================================
Cypress.Commands.add('mockCostCentersApi', (costCenters?: any[]) => {
  const defaultCostCenters = [
    { id: 1, code: 'CC001', name: 'Administración' },
    { id: 2, code: 'CC002', name: 'Ventas' },
    { id: 3, code: 'CC003', name: 'Producción' }
  ];

  cy.intercept('GET', '**/accounting/cost-centers**', {
    statusCode: 200,
    body: costCenters || defaultCostCenters,
  }).as('costCentersRequest');
});

// ==========================================
// Mock Elements API
// ==========================================
Cypress.Commands.add('mockElementsApi', (elements?: any[]) => {
  const defaultElements = [
    { code: '1', name: 'Gastos de Personal' },
    { code: '2', name: 'Gastos de Operación' },
    { code: '3', name: 'Gastos Financieros' }
  ];

  cy.intercept('GET', '**/accounting/elements**', {
    statusCode: 200,
    body: elements || defaultElements,
  }).as('elementsRequest');
});

// ==========================================
// Mock Subelements API
// ==========================================
Cypress.Commands.add('mockSubelementsApi', (subelements?: any[]) => {
  const defaultSubelements = [
    { code: '1.1', name: 'Salarios', elementCode: '1' },
    { code: '1.2', name: 'Seguridad Social', elementCode: '1' },
    { code: '2.1', name: 'Alquiler', elementCode: '2' }
  ];

  cy.intercept('GET', '**/accounting/subelements**', {
    statusCode: 200,
    body: subelements || defaultSubelements,
  }).as('subelementsRequest');
});

// ==========================================
// Mock Vouchers API
// ==========================================
Cypress.Commands.add('mockVouchersApi', (vouchers?: any[]) => {
  const defaultVouchers = [
    {
      id: '1',
      voucherNumber: 'COP-00001',
      date: '2024-04-24',
      description: 'Comprobante de prueba',
      status: 'draft',
      totalAmount: 1000,
      lines: []
    },
    {
      id: '2',
      voucherNumber: 'COP-00002',
      date: '2024-04-23',
      description: 'Comprobante contabilizado',
      status: 'posted',
      totalAmount: 2000,
      lines: []
    }
  ];

  cy.intercept('GET', '**/accounting/vouchers**', {
    statusCode: 200,
    body: vouchers || defaultVouchers,
  }).as('vouchersRequest');
});

// ==========================================
// Mock Invoices API
// ==========================================
Cypress.Commands.add('mockInvoicesApi', (invoices?: any[]) => {
  const defaultInvoices = [
    {
      id: '1',
      invoiceNumber: 'F001-2024',
      date: '2024-04-24',
      customerName: 'Cliente Demo',
      total: 1000,
      status: 'pending',
      items: []
    },
    {
      id: '2',
      invoiceNumber: 'F002-2024',
      date: '2024-04-23',
      customerName: 'Cliente Test',
      total: 2000,
      status: 'paid',
      items: []
    }
  ];

  cy.intercept('GET', '**/invoices**', {
    statusCode: 200,
    body: { data: invoices || defaultInvoices, total: (invoices || defaultInvoices).length },
  }).as('invoicesRequest');
});

// ==========================================
// Mock Customers API
// ==========================================
Cypress.Commands.add('mockCustomersApi', (customers?: any[]) => {
  const defaultCustomers = [
    { id: 1, name: 'Cliente Demo', email: 'cliente@demo.com', phone: '123456789' },
    { id: 2, name: 'Cliente Test', email: 'test@cliente.com', phone: '987654321' },
    { id: 3, name: 'Empresa ABC', email: 'info@abc.com', phone: '555123456' }
  ];

  cy.intercept('GET', '**/customers**', {
    statusCode: 200,
    body: customers || defaultCustomers,
  }).as('customersRequest');
});

// ==========================================
// Mock Fiscal Years API
// ==========================================
Cypress.Commands.add('mockFiscalYearsApi', (fiscalYears?: any[]) => {
  const defaultFiscalYears = [
    {
      id: 1,
      year: 2024,
      description: 'Año Fiscal 2024',
      status: 'open',
      periods: 12
    },
    {
      id: 2,
      year: 2023,
      description: 'Año Fiscal 2023',
      status: 'closed',
      periods: 12
    }
  ];

  cy.intercept('GET', '**/accounting/fiscal-years**', {
    statusCode: 200,
    body: fiscalYears || defaultFiscalYears,
  }).as('fiscalYearsRequest');
});

// ==========================================
// Mock Fixed Assets API
// ==========================================
Cypress.Commands.add('mockFixedAssetsApi', (fixedAssets?: any[]) => {
  const defaultFixedAssets = [
    {
      id: 1,
      code: 'EQ-001',
      description: 'Computadora Portátil',
      acquisitionDate: '2024-01-15',
      originalValue: 1200,
      depreciationRate: 0.2,
      usefulLife: 5,
      accumulatedDepreciation: 480,
      netValue: 720,
      status: 'active',
      groupNumber: 3
    },
    {
      id: 2,
      code: 'EQ-002',
      description: 'Mueble de Oficina',
      acquisitionDate: '2023-06-01',
      originalValue: 800,
      depreciationRate: 0.1,
      usefulLife: 10,
      accumulatedDepreciation: 160,
      netValue: 640,
      status: 'active',
      groupNumber: 5
    }
  ];

  cy.intercept('GET', '**/fixed-assets**', {
    statusCode: 200,
    body: fixedAssets || defaultFixedAssets,
  }).as('fixedAssetsRequest');
});
