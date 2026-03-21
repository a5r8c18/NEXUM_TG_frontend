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
      {
        path: 'warehouses',
        loadComponent: () => import('./warehouses/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent)
      },
      {
        path: 'warehouses/new',
        loadComponent: () => import('./warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent)
      },
      {
        path: 'warehouses/:id/edit',
        loadComponent: () => import('./warehouses/warehouse-form/warehouse-form.component').then(m => m.WarehouseFormComponent)
      }
    ])
  ]
})
export class SettingsModule { }