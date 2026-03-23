import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantSelectedGuard } from './core/guards/tenant-selected.guard';
import { companySelectedGuard } from './core/guards/company-selected.guard';
import { permissionsGuard } from './core/guards/permissions.guard';

export const routes: Routes = [
  // Rutas de Desarrollo (acceso directo sin guards)
  {
    path: 'dev/tenant-requests',
    loadComponent: () => import('./admin/tenant-requests/tenant-requests.component').then(m => m.TenantRequestsComponent)
  },
  {
    path: 'dev/tenant-request',
    loadComponent: () => import('./auth/tenant-request/tenant-request.component').then(m => m.TenantRequestComponent)
  },
  {
    path: 'dev/company-selection',
    loadComponent: () => import('./shared/components/context-selector/company-selector/company-selector.component').then(m => m.CompanySelectorComponent)
  },
  {
    path: 'dev/dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'dev/login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dev/landing',
    loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent)
  },
  
  // Rutas Principales (con guards simplificados)
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
    path: 'signup',
    loadComponent: () => import('./auth/tenant-request/tenant-request.component').then(m => m.TenantRequestComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/sign-up/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'company-selection',
    loadComponent: () => import('./shared/components/context-selector/company-selector/company-selector.component').then(m => m.CompanySelectorComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard, companySelectedGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // Inventory Module
      {
        path: 'inventory',
        loadComponent: () => import('./modules/inventory/inventory-table.component').then(m => m.InventoryTableComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/entry',
        loadComponent: () => import('./modules/inventory/submodules/entry/entry.component').then(m => m.EntryComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/reports',
        loadComponent: () => import('./modules/inventory/submodules/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/warehouses',
        loadComponent: () => import('./modules/inventory/submodules/warehouses/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/warehouses/new',
        loadComponent: () => import('./modules/inventory/submodules/warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/warehouses/:id/edit',
        loadComponent: () => import('./modules/inventory/submodules/warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/stock-limits',
        loadComponent: () => import('./modules/inventory/submodules/stock-limits/stock-limits-list/stock-limits-list.component').then(m => m.StockLimitsListComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/stock-limits/new',
        loadComponent: () => import('./modules/inventory/submodules/stock-limits/stock-limits-form/stock-limits-form.component').then(m => m.StockLimitsFormComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/stock-limits/:id/edit',
        loadComponent: () => import('./modules/inventory/submodules/stock-limits/stock-limits-form/stock-limits-form.component').then(m => m.StockLimitsFormComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'inventory/movements',
        loadComponent: () => import('./modules/inventory/submodules/movements/movements-list.component').then(m => m.MovementsListComponent),
        canActivate: [permissionsGuard]
      },
      // Billing Module
      {
        path: 'billing/invoices',
        loadComponent: () => import('./modules/invoices/invoices.component').then(m => m.InvoicesComponent),
        canActivate: [permissionsGuard]
      },
      {
        path: 'billing/fixed-assets',
        loadComponent: () => import('./modules/fixed-assets/fixed-assets.component').then(m => m.FixedAssetsComponent),
        canActivate: [permissionsGuard]
      },
      // Admin Module (solo superadmin)
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
        canActivate: [authGuard, permissionsGuard],
        data: { permission: 'admin.access' }
      },
      // Admin Tenant Requests (acceso directo)
      {
        path: 'admin/tenant-requests',
        loadComponent: () => import('./admin/tenant-requests/tenant-requests.component').then(m => m.TenantRequestsComponent),
        canActivate: [authGuard, tenantSelectedGuard]
      },
      // Admin Tenant Requests (desarrollo - solo auth)
      {
        path: 'tenant-requests',
        loadComponent: () => import('./admin/tenant-requests/tenant-requests.component').then(m => m.TenantRequestsComponent),
        canActivate: [authGuard]
      },
      // Settings Module (configuración por compañía)
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule),
        canActivate: [authGuard, tenantSelectedGuard, companySelectedGuard, permissionsGuard],
        data: { permission: 'settings.access' }
      }
    ]
  },
  { path: '**', redirectTo: '/' }
];
