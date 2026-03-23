import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        redirectTo: 'general',
        pathMatch: 'full'
      },
      {
        path: 'general',
        loadComponent: () => import('./general/general.component').then(m => m.GeneralComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users.component').then(m => m.UsersComponent)
      },
      // Configuración de Empresas (solo para multi-empresa)
      { 
        path: 'companies', 
        loadComponent: () => import('./companies/company-list/company-list.component').then(m => m.CompanyListComponent),
        // canActivate: [multiCompanyGuard] // TODO: Implementar guard
      },
      { 
        path: 'companies/new', 
        loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent),
        // canActivate: [multiCompanyGuard] // TODO: Implementar guard
      },
      { 
        path: 'companies/:id/edit', 
        loadComponent: () => import('./companies/company-form/company-form.component').then(m => m.CompanyFormComponent),
        // canActivate: [multiCompanyGuard] // TODO: Implementar guard
      }
    ])
  ]
})
export class SettingsModule { }