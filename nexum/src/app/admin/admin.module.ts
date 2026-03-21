import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        redirectTo: 'tenants',
        pathMatch: 'full'
      },
      {
        path: 'tenants',
        loadComponent: () => import('./tenants/tenant-list/tenant-list.component').then(m => m.TenantListComponent)
      },
      {
        path: 'tenants/new',
        loadComponent: () => import('./tenants/tenant-form/tenant-form.component').then(m => m.TenantFormComponent)
      },
      {
        path: 'tenants/:id',
        loadComponent: () => import('./tenants/tenant-detail/tenant-detail.component').then(m => m.TenantDetailComponent)
      },
      {
        path: 'tenants/:id/edit',
        loadComponent: () => import('./tenants/tenant-form/tenant-form.component').then(m => m.TenantFormComponent)
      },
      {
        path: 'tenant-requests',
        loadComponent: () => import('./tenant-requests/tenant-requests.component').then(m => m.TenantRequestsComponent)
      },
      {
        path: 'companies',
        loadComponent: () => import('./companies/company-list/company-list.component').then(m => m.CompanyListComponent)
      },
      {
        path: 'companies/new',
        loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent)
      },
      {
        path: 'companies/:id',
        loadComponent: () => import('./companies/company-detail/company-detail.component').then(m => m.CompanyDetailComponent)
      },
      {
        path: 'companies/:id/edit',
        loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent)
      }
    ])
  ]
})
export class AdminModule { }