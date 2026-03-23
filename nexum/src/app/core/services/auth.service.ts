import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface NexumUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'user';
  tenantId: string;
  tenantName: string;
  tenantType: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  avatarUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal(false);
  private currentUserSignal = signal<NexumUser | null>(null);
  private isDevMode = signal(false);

  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  currentUser = this.currentUserSignal.asReadonly();

  private router = inject(Router);

  constructor() {
    this.isDevMode.set(
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    );
    this.checkAuthStatus();
  }

  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      // TODO: Reemplazar con llamada real a POST /auth/login
      const delay = this.isDevMode() ? 500 : 1000;

      setTimeout(() => {
        if (!email || !password) {
          resolve(false);
          return;
        }

        // Simular respuesta del backend con tenant info
        const isMulti = email.includes('multi') || email.includes('admin') || email.includes('dev');
        const user: NexumUser = {
          id: 'user-' + Date.now(),
          email,
          firstName: this.isDevMode() ? 'Developer' : 'Usuario',
          lastName: this.isDevMode() ? 'User' : 'NEXUM',
          role: 'admin',
          tenantId: isMulti ? 'tenant-multi-1' : 'tenant-single-1',
          tenantName: isMulti ? 'Grupo Empresarial Demo' : 'Mi Empresa Demo',
          tenantType: isMulti ? 'MULTI_COMPANY' : 'SINGLE_COMPANY'
        };

        this.setSession(user, 'simulated-jwt-token-' + Date.now());
        resolve(true);
      }, delay);
    });
  }

  // Método para desarrollo: saltar autenticación
  skipAuth(): void {
    if (this.isDevMode()) {
      const user: NexumUser = {
        id: 'dev-user',
        email: 'dev@nexum.com',
        firstName: 'Developer',
        lastName: 'Mode',
        role: 'superadmin',
        tenantId: 'tenant-dev',
        tenantName: 'Tenant Desarrollo',
        tenantType: 'MULTI_COMPANY'
      };
      this.setSession(user, 'dev-jwt-token');
    }
  }

  signup(userData: { firstName: string; lastName: string; email: string; password: string; token?: string }): Promise<boolean> {
    return new Promise((resolve) => {
      // TODO: Reemplazar con llamada real a POST /auth/register
      setTimeout(() => {
        if (userData.email && userData.password) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  }

  // Validar token de registro (solicitud aprobada)
  validateRegistrationToken(token: string): Promise<{ valid: boolean; email?: string; tenantType?: string }> {
    return new Promise((resolve) => {
      // TODO: Reemplazar con llamada real a GET /auth/validate-token/:token
      setTimeout(() => {
        // Simulación: tokens que empiezan con "approved-" son válidos
        if (token && token.startsWith('approved-')) {
          resolve({
            valid: true,
            email: 'usuario@empresa.com',
            tenantType: 'MULTI_COMPANY'
          });
        } else {
          resolve({ valid: false });
        }
      }, 500);
    });
  }

  logout(): void {
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  isDevelopment(): boolean {
    return this.isDevMode();
  }

  isMultiCompany(): boolean {
    return this.currentUser()?.tenantType === 'MULTI_COMPANY';
  }

  isSingleCompany(): boolean {
    return this.currentUser()?.tenantType === 'SINGLE_COMPANY';
  }

  getCurrentUserTenant(): { type: string; name: string; id: string } | null {
    const user = this.currentUser();
    if (!user) return null;
    return {
      type: user.tenantType,
      name: user.tenantName,
      id: user.tenantId
    };
  }

  getFullName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  private setSession(user: NexumUser, token: string): void {
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as NexumUser;
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
      } catch {
        this.logout();
      }
    }
  }
}
