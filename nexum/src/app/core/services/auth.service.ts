import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  currentCompanyId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal(false);
  private currentUserSignal = signal<NexumUser | null>(null);
  private currentCompanyIdSignal = signal<number>(1);
  private isDevMode = signal(false);

  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  currentUser = this.currentUserSignal.asReadonly();
  currentCompanyId = this.currentCompanyIdSignal.asReadonly();

  private router = inject(Router);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {
    this.isDevMode.set(
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    );
    this.checkAuthStatus();
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!email || !password) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<{ user: any; token: string }>(`${this.apiUrl}/auth/login`, { email, password })
      );

      if (response && response.token) {
        const user: NexumUser = {
          id: response.user.id,
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          role: response.user.role || 'admin',
          tenantId: response.user.tenantId || 'tenant-1',
          tenantName: response.user.tenantName || 'Empresa Demo',
          tenantType: response.user.tenantType || 'MULTI_COMPANY'
        };
        this.setSession(user, response.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
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
        tenantType: 'MULTI_COMPANY',
        currentCompanyId: 1
      };
      this.setSession(user, 'dev-jwt-token');
    }
  }

  async signup(userData: { firstName: string; lastName: string; email: string; password: string; token?: string }): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ user: any; token: string }>(`${this.apiUrl}/auth/register`, userData)
      );
      return !!(response?.user && response?.token);
    } catch {
      return false;
    }
  }

  // Validar token de registro (solicitud aprobada)
  async validateRegistrationToken(token: string): Promise<{ valid: boolean; email?: string; tenantType?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ valid: boolean; email?: string; tenantType?: string }>(`${this.apiUrl}/auth/validate-token/${token}`)
      );
      return response;
    } catch {
      return { valid: false };
    }
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

  setCurrentCompanyId(companyId: number): void {
    this.currentCompanyIdSignal.set(companyId);
    const user = this.currentUser();
    if (user) {
      user.currentCompanyId = companyId;
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  getCurrentCompanyId(): number {
    const user = this.currentUser();
    return user?.currentCompanyId || this.currentCompanyIdSignal();
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
