describe('Invoices - Facturación', () => {
  beforeEach(() => {
    // Mock APIs
    cy.mockLoginApi({ role: 'admin', tenantType: 'SINGLE_COMPANY' });
    cy.mockCompaniesApi();
    cy.mockInvoicesApi();
    cy.mockCustomersApi();

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

  it('should display the invoices page', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Should display page title
    cy.contains('h1, h2', /Facturas|Invoices/i).should('be.visible');
    
    // Should display table headers
    cy.contains('Número').should('be.visible');
    cy.contains('Fecha').should('be.visible');
    cy.contains('Cliente').should('be.visible');
    cy.contains('Total').should('be.visible');
    cy.contains('Estado').should('be.visible');
  });

  it('should show existing invoices', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Should display invoice data
    cy.contains('F001-2024').should('be.visible');
    cy.contains('F002-2024').should('be.visible');
    cy.contains('Cliente Demo').should('be.visible');
    cy.contains('pending').should('be.visible');
    cy.contains('paid').should('be.visible');
  });

  it('should open create invoice modal', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Click create button
    cy.contains('button', /Nueva|Crear|Agregar/i).click();

    // Modal should open
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.contains('h2, h3', /Nueva Factura|Crear Factura/i).should('be.visible');
  });

  it('should create a new invoice with valid data', () => {
    cy.intercept('POST', '**/invoices', {
      statusCode: 201,
      body: {
        id: 'new-invoice-id',
        invoiceNumber: 'F003-2024',
        date: '2024-04-24',
        customerName: 'Cliente Cypress',
        total: 1500,
        status: 'pending',
        items: []
      }
    }).as('createInvoiceRequest');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Fill header
    cy.get('#customerName').type('Cliente Cypress');
    cy.get('#date').type('2024-04-24');

    // Add invoice item
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-description-0"]').type('Producto de prueba');
    cy.get('[data-cy="item-quantity-0"]').type('10');
    cy.get('[data-cy="item-unit-price-0"]').type('150');

    // Save invoice
    cy.contains('button', /Guardar|Crear/i).click();
    cy.wait('@createInvoiceRequest');

    // Should show success message
    cy.contains(/Factura creada|Guardada exitosamente/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Try to save without filling required fields
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation errors
    cy.contains(/Complete todos los campos requeridos|campo requerido/i).should('be.visible');
  });

  it('should edit an existing invoice', () => {
    cy.intercept('PUT', '**/invoices/**', {
      statusCode: 200,
      body: {
        id: 'edit-invoice-id',
        invoiceNumber: 'F001-2024',
        date: '2024-04-24',
        customerName: 'Cliente Editado',
        total: 2000,
        status: 'pending',
        items: []
      }
    }).as('updateInvoiceRequest');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Click edit button for first invoice
    cy.get('[data-cy="edit-invoice-0"]').click();

    // Modal should open with existing data
    cy.get('[role="dialog"], .modal, .overlay').should('be.visible');
    cy.get('#customerName').should('have.value', 'Cliente Demo');

    // Edit customer name
    cy.get('#customerName').clear().type('Cliente Editado');

    // Save changes
    cy.contains('button', /Actualizar|Guardar/i).click();
    cy.wait('@updateInvoiceRequest');

    // Should show success message
    cy.contains(/Factura actualizada|Guardada exitosamente/i).should('be.visible');
  });

  it('should mark invoice as paid', () => {
    cy.intercept('PUT', '**/invoices/**/status', {
      statusCode: 200,
      body: {
        id: 'pay-invoice-id',
        status: 'paid'
      }
    }).as('payInvoiceRequest');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Click pay button for pending invoice
    cy.get('[data-cy="pay-invoice-0"]').click();

    // Confirm payment
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@payInvoiceRequest');

    // Should show success message
    cy.contains(/Factura pagada|Marcada como pagada/i).should('be.visible');
  });

  it('should cancel an invoice', () => {
    cy.intercept('PUT', '**/invoices/**/status', {
      statusCode: 200,
      body: {
        id: 'cancel-invoice-id',
        status: 'cancelled'
      }
    }).as('cancelInvoiceRequest');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Click cancel button
    cy.get('[data-cy="cancel-invoice-0"]').click();

    // Confirm cancellation
    cy.contains('button', /Confirmar|Sí/i).click();
    cy.wait('@cancelInvoiceRequest');

    // Should show success message
    cy.contains(/Factura anulada|Cancelada/i).should('be.visible');
  });

  it('should filter invoices by status', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Filter by pending status
    cy.get('[data-cy="status-filter"]').select('pending');

    // Should only show pending invoices
    cy.contains('pending').should('be.visible');
    cy.contains('paid').should('not.exist');
  });

  it('should filter invoices by date range', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Set date range
    cy.get('[data-cy="date-from"]').type('2024-04-01');
    cy.get('[data-cy="date-to"]').type('2024-04-30');

    // Apply filter
    cy.contains('button', /Filtrar|Aplicar/i).click();

    // Should show filtered results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should search invoices by customer', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Search by customer name
    cy.get('[data-cy="search-input"]').type('Cliente Demo');

    // Should show filtered results
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
  });

  it('should export invoice to PDF', () => {
    cy.intercept('GET', '**/invoices/**/pdf', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=invoice.pdf'
      },
      body: new ArrayBuffer(8) // Mock PDF file
    }).as('exportPdfRequest');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Click export PDF button for first invoice
    cy.get('[data-cy="export-pdf-0"]').click();
    cy.wait('@exportPdfRequest');

    // Should trigger download
    cy.readFile('invoice.pdf').should('exist');
  });

  it('should export invoice to Excel', () => {
    cy.intercept('GET', '**/invoices/**/excel', {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=invoice.xlsx'
      },
      body: new ArrayBuffer(8) // Mock Excel file
    }).as('exportExcelRequest');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Click export Excel button for first invoice
    cy.get('[data-cy="export-excel-0"]').click();
    cy.wait('@exportExcelRequest');

    // Should trigger download
    cy.readFile('invoice.xlsx').should('exist');
  });

  it('should calculate totals correctly', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Add multiple items
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-description-0"]').type('Producto 1');
    cy.get('[data-cy="item-quantity-0"]').type('5');
    cy.get('[data-cy="item-unit-price-0"]').type('100');

    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-description-1"]').type('Producto 2');
    cy.get('[data-cy="item-quantity-1"]').type('3');
    cy.get('[data-cy="item-unit-price-1"]').type('200');

    // Check total calculation: (5 * 100) + (3 * 200) = 500 + 600 = 1100
    cy.contains(/Total|Subtotal/i).parent().should('contain', '1,100');
  });

  it('should handle empty data gracefully', () => {
    // Mock empty invoices
    cy.intercept('GET', '**/invoices', {
      statusCode: 200,
      body: { data: [], total: 0 }
    }).as('emptyInvoicesRequest');

    cy.visit('/billing/invoices');
    cy.wait('@emptyInvoicesRequest');

    // Should show empty state message
    cy.contains(/No hay facturas|Sin resultados|No se encontraron facturas/i).should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Mock error response
    cy.intercept('GET', '**/invoices', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('invoicesError');

    cy.visit('/billing/invoices');
    cy.wait('@invoicesError');

    // Should show error message
    cy.contains(/Error al cargar|Intente nuevamente|No se pudieron cargar/i).should('be.visible');
  });

  it('should validate invoice number uniqueness', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Open create modal
    cy.contains('button', /Nueva|Crear/i).click();

    // Try to use existing invoice number
    cy.get('#invoiceNumber').type('F001-2024');

    // Try to save
    cy.contains('button', /Guardar|Crear/i).click();

    // Should show validation error
    cy.contains(/Número de factura ya existe|Duplicado/i).should('be.visible');
  });

  it('should show invoice statistics', () => {
    cy.visit('/billing/invoices');
    cy.wait('@invoicesRequest');

    // Should display statistics
    cy.contains(/Total Facturas|Total Invoices/i).should('be.visible');
    cy.contains(/Pagadas|Paid/i).should('be.visible');
    cy.contains(/Pendientes|Pending/i).should('be.visible');
    cy.contains(/Anuladas|Cancelled/i).should('be.visible');
  });

  it('should paginate results', () => {
    // Mock many invoices
    const manyInvoices = Array.from({ length: 50 }, (_, i) => ({
      id: `inv-${i}`,
      invoiceNumber: `F${String(i + 1).padStart(3, '0')}-2024`,
      date: '2024-04-24',
      customerName: `Cliente ${i + 1}`,
      total: 1000 + i * 100,
      status: i % 2 === 0 ? 'pending' : 'paid'
    }));

    cy.intercept('GET', '**/invoices', {
      statusCode: 200,
      body: { data: manyInvoices, total: 50 }
    }).as('manyInvoicesRequest');

    cy.visit('/billing/invoices');
    cy.wait('@manyInvoicesRequest');

    // Should show pagination controls
    cy.contains(/Siguiente|Next/i).should('be.visible');
    cy.contains(/Anterior|Previous/i).should('be.visible');
  });
});
