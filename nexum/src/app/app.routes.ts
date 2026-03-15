import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'signup', 
    loadComponent: () => import('./auth/sign_up/signup.component').then(m => m.SignupComponent)
  },
  { 
    path: '', 
    loadComponent: () => import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { 
        path: 'inventory', 
        loadComponent: () => import('./modules/inventory/inventory-table.component').then(m => m.InventoryTableComponent)
      },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
