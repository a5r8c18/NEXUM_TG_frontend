import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: 'general',
    loadComponent: () => import('./general/general.component').then(m => m.GeneralComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users.component').then(m => m.UsersComponent)
  },
  {
    path: 'companies',
    children: [
      {
        path: '',
        loadComponent: () => import('./companies/company-list/company-list.component').then(m => m.CompanyListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent)
      }
    ]
  },
  {
    path: 'warehouses',
    children: [
      {
        path: '',
        loadComponent: () => import('./warehouses/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent)
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: 'general',
    pathMatch: 'full'
  }
];