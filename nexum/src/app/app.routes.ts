import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantSelectedGuard } from './core/guards/tenant-selected.guard';
import { companySelectedGuard } from './core/guards/company-selected.guard';
import { permissionsGuard } from './core/guards/permissions.guard';
import { RoleGuard, AdminOnlyGuard, SuperadminOnlyGuard } from './core/guards/role.guard';
import { subscriptionGuard } from './core/guards/subscription.guard';

export const routes: Routes = [
  // Rutas Principales
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'tenant-request',
    loadComponent: () => import('./auth/tenant-request/tenant-request.component').then(m => m.TenantRequestComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/sign-up/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'setup-password',
    loadComponent: () => import('./auth/setup-password/setup-password.component').then(m => m.SetupPasswordComponent)
  },
  {
    path: 'mfa-setup',
    loadComponent: () => import('./auth/mfa-setup/mfa-setup.component').then(m => m.MfaSetupComponent),
    canActivate: [authGuard]
  },
  {
    path: 'company-selection',
    loadComponent: () => import('./shared/components/context-selector/company-selector/company-selector.component').then(m => m.CompanySelectorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'subscription-blocked',
    loadComponent: () => import('./auth/subscription-blocked/subscription-blocked.component').then(m => m.SubscriptionBlockedComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard, companySelectedGuard, subscriptionGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // Inventory Module
      {
        path: 'inventory',
        loadComponent: () => import('./modules/inventory/inventory-table.component').then(m => m.InventoryTableComponent)
      },
      {
        path: 'inventory/catalog',
        loadComponent: () => import('./modules/inventory/catalog/catalog.component').then(m => m.CatalogComponent)
      },
      {
        path: 'inventory/reports',
        loadComponent: () => import('./modules/inventory/submodules/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'inventory/physical-count',
        loadComponent: () => import('./modules/inventory/physical-count/physical-count.component').then(m => m.PhysicalCountComponent)
      },
      {
        path: 'inventory/analytics',
        loadComponent: () => import('./modules/inventory/analytics/analytics.component').then(m => m.InventoryAnalyticsComponent)
      },
      {
        path: 'inventory/suppliers',
        loadComponent: () => import('./modules/inventory/suppliers/suppliers.component').then(m => m.SuppliersComponent)
      },
            {
        path: 'inventory/warehouses',
        loadComponent: () => import('./modules/inventory/submodules/warehouses/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent)
      },
      {
        path: 'inventory/warehouses/new',
        loadComponent: () => import('./modules/inventory/submodules/warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent)
      },
      {
        path: 'inventory/warehouses/:id/edit',
        loadComponent: () => import('./modules/inventory/submodules/warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent)
      },
      {
        path: 'inventory/stock-limits',
        loadComponent: () => import('./modules/inventory/submodules/stock-limits/stock-limits-list/stock-limits-list.component').then(m => m.StockLimitsListComponent)
      },
      {
        path: 'inventory/stock-limits/new',
        loadComponent: () => import('./modules/inventory/submodules/stock-limits/stock-limits-form/stock-limits-form.component').then(m => m.StockLimitsFormComponent)
      },
      {
        path: 'inventory/stock-limits/:id/edit',
        loadComponent: () => import('./modules/inventory/submodules/stock-limits/stock-limits-form/stock-limits-form.component').then(m => m.StockLimitsFormComponent)
      },
      {
        path: 'inventory/movements',
        loadComponent: () => import('./modules/inventory/submodules/movements/movements-list.component').then(m => m.MovementsListComponent)
      },
      {
        path: 'inventory/entry/new',
        loadComponent: () => import('./modules/inventory/submodules/movements/entry-page/entry-page.component').then(m => m.EntryPageComponent)
      },
      {
        path: 'inventory/exit/new',
        loadComponent: () => import('./modules/inventory/submodules/movements/exit-page/exit-page.component').then(m => m.ExitPageComponent)
      },
      {
        path: 'inventory/purchase-orders',
        loadComponent: () => import('./modules/inventory/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent)
      },
      {
        path: 'inventory/purchases/:id/invoice',
        loadComponent: () => import('./modules/inventory/purchase-invoice/purchase-invoice.component').then(m => m.PurchaseInvoiceComponent)
      },
      {
        path: 'inventory/purchases/:id/reconcile',
        loadComponent: () => import('./modules/inventory/purchase-reconcile/purchase-reconcile.component').then(m => m.PurchaseReconcileComponent)
      },
      // Finance Module
      {
        path: 'finance/working-capital',
        loadComponent: () => import('./modules/finance/working-capital/working-capital.component').then(m => m.WorkingCapitalComponent)
      },
      {
        path: 'finance',
        loadComponent: () => import('./modules/finance/finance-dashboard.component').then(m => m.FinanceDashboardComponent)
      },
      {
        path: 'finance/receivables',
        loadComponent: () => import('./modules/finance/receivables/receivables.component').then(m => m.ReceivablesComponent)
      },
      {
        path: 'finance/payables',
        loadComponent: () => import('./modules/finance/payables/payables.component').then(m => m.PayablesComponent)
      },
      {
        path: 'finance/banks',
        loadComponent: () => import('./modules/finance/banks/banks.component').then(m => m.BanksComponent)
      },
      {
        path: 'finance/cash',
        loadComponent: () => import('./modules/finance/cash/cash.component').then(m => m.CashComponent)
      },
      {
        path: 'finance/payments',
        loadComponent: () => import('./modules/finance/payments/payments.component').then(m => m.PaymentsComponent)
      },
      {
        path: 'finance/bank-reconciliation',
        loadComponent: () => import('./modules/finance/bank-reconciliation/bank-reconciliation.component').then(m => m.BankReconciliationComponent)
      },
      // Billing Module
      {
        path: 'billing/invoices',
        loadComponent: () => import('./modules/invoices/invoices.component').then(m => m.InvoicesComponent),
        canActivate: [RoleGuard]
      },
      {
        path: 'billing/fixed-assets',
        loadComponent: () => import('./modules/fixed-assets/fixed-assets.component').then(m => m.FixedAssetsComponent)
      },
      // Accounting Module
      {
        path: 'accounting',
        loadComponent: () => import('./modules/accounting/submodules/journal-entries/journal-entries.component').then(m => m.JournalEntriesComponent)
      },
      {
        path: 'accounting/reports',
        loadComponent: () => import('./modules/accounting/submodules/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'accounting/accounts',
        loadComponent: () => import('./modules/accounting/submodules/accounts/accounts.component').then(m => m.AccountsComponent)
      },
            {
        path: 'accounting/elementos',
        loadComponent: () => import('./modules/accounting/submodules/elementos/elementos.component').then(m => m.ElementosComponent)
      },
      {
        path: 'accounting/cost-centers',
        loadComponent: () => import('./modules/accounting/submodules/cost-centers/cost-centers.component').then(m => m.CostCentersComponent)
      },
      {
        path: 'accounting/fiscal-years',
        loadComponent: () => import('./modules/accounting/submodules/fiscal-years/fiscal-years.component').then(m => m.FiscalYearsComponent)
      },
      {
        path: 'accounting/budget',
        loadComponent: () => import('./modules/accounting/submodules/budget/budget.component').then(m => m.BudgetComponent)
      },
      // HR Module
      {
        path: 'hr',
        redirectTo: 'hr/employees',
        pathMatch: 'full'
      },
      {
        path: 'hr/employees',
        loadComponent: () => import('./modules/hr/employees/employees.component').then(m => m.EmployeesComponent)
      },
      {
        path: 'hr/departments',
        loadComponent: () => import('./modules/hr/departments/departments.component').then(m => m.DepartmentsComponent)
      },
      {
        path: 'hr/payroll',
        loadComponent: () => import('./modules/hr/payroll/payroll.component').then(m => m.PayrollComponent)
      },
      // Messages Module
      {
        path: 'messages',
        loadComponent: () => import('./modules/messages/messages.component').then(m => m.MessagesComponent)
      },
      // Admin Module (solo superadmin - Teneduria Garcia)
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
        canActivate: [SuperadminOnlyGuard]
      },
      // Admin Tenant Requests (solo superadmin)
      {
        path: 'admin/tenant-requests',
        loadComponent: () => import('./admin/tenant-requests/tenant-requests.component').then(m => m.TenantRequestsComponent),
        canActivate: [SuperadminOnlyGuard]
      },
      // Admin Subscriptions (solo superadmin)
      {
        path: 'admin/subscriptions',
        loadComponent: () => import('./admin/subscriptions/subscriptions-admin.component').then(m => m.SubscriptionsAdminComponent),
        canActivate: [SuperadminOnlyGuard]
      },
      // Settings Module (configuración por compañía)
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule),
        canActivate: [authGuard, companySelectedGuard],
        data: { permission: 'settings.access' }
      }
    ]
  },
  { path: '**', redirectTo: '/' }
];
