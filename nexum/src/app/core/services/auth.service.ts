import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContextService } from './context.service';
import { CompanyService } from './company.service';

export interface NexumUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin' | 'user' | 'facturador';
  tenantId: string;
  tenantName: string;
  tenantType: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  avatarUrl?: string;
  currentCompanyId?: number;
  companyId?: number; // For compatibility
  companies?: any[]; // Available companies for multi-company users
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
  private contextService = inject(ContextService);
  private companyService = inject(CompanyService);
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
        
        // Establecer la empresa en el ContextService
        if (response.user.companyId) {
          await this.setCompanyContext(response.user.companyId);
        }
        
        // Establecer el tenant en el ContextService
        this.contextService.setCurrentTenant({
          id: response.user.tenantId || 'tenant-1',
          name: response.user.tenantName || 'Tenant Demo',
          type: response.user.tenantType || 'SINGLE_COMPANY',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  isSuperadmin(): boolean {
    return this.currentUser()?.role === 'superadmin';
  }

  isAdmin(): boolean {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'superadmin';
  }

  async signup(userData: { firstName: string; lastName: string; email: string; password: string; token?: string }): Promise<boolean> {
    console.log('🔥 AUTH SERVICE - Método signup llamado!');
    console.group('🌐 AUTH SERVICE - Enviando petición de registro');
    console.log('📡 URL:', `${this.apiUrl}/auth/register`);
    console.log('📤 Payload:', userData);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    try {
      const response = await firstValueFrom(
        this.http.post<{ user: any; token: string }>(`${this.apiUrl}/auth/register`, userData)
      );
      
      console.group('🌐 AUTH SERVICE - Respuesta del backend');
      console.log('✅ Status: 200 OK');
      console.log('📦 Response:', response);
      console.log('👤 Usuario creado:', response?.user);
      console.log('🔐 Token generado:', !!response?.token);
      console.log('🆔 User ID:', response?.user?.id);
      console.log('📧 User Email:', response?.user?.email);
      console.groupEnd();
      
      return !!(response?.user && response?.token);
    } catch (error: any) {
      console.group('🌐 AUTH SERVICE - Error en petición HTTP');
      console.error('❌ Error completo:', error);
      console.log('📄 Tipo de error:', error?.constructor?.name);
      console.log('📝 Mensaje:', error?.message || 'Sin mensaje');
      console.log('🔍 Status HTTP:', error?.status || 'N/A');
      console.log('📦 Error response body:', error?.error || 'N/A');
      console.log('🌐 URL:', `${this.apiUrl}/auth/register`);
      console.log('📤 Payload enviado:', userData);
      console.groupEnd();
      
      return false;
    }
  }

  // Validar token de registro (solicitud aprobada)
  async validateRegistrationToken(token: string): Promise<{ valid: boolean; email?: string; firstName?: string; lastName?: string; tenantType?: string }> {
    console.group('🌐 AUTH SERVICE - Validando token');
    console.log('📡 URL:', `${this.apiUrl}/auth/validate-token/${token}`);
    console.log('🆔 Token:', token);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    try {
      const response = await firstValueFrom(
        this.http.get<{ valid: boolean; email?: string; firstName?: string; lastName?: string; tenantType?: string }>(`${this.apiUrl}/auth/validate-token/${token}`)
      );
      
      console.group('🌐 AUTH SERVICE - Respuesta validación token');
      console.log('✅ Status: 200 OK');
      console.log('📦 Response:', response);
      console.log('✅ Válido:', response?.valid);
      console.log('📧 Email:', response?.email);
      console.log('👤 Nombre:', response?.firstName, response?.lastName);
      console.log('🏢 Tenant Type:', response?.tenantType);
      console.groupEnd();
      
      return response;
    } catch (error: any) {
      console.group('🌐 AUTH SERVICE - Error validando token');
      console.error('❌ Error completo:', error);
      console.log('📄 Tipo de error:', error?.constructor?.name);
      console.log('📝 Mensaje:', error?.message || 'Sin mensaje');
      console.log('🔍 Status HTTP:', error?.status || 'N/A');
      console.log('📦 Error response body:', error?.error || 'N/A');
      console.log('🌐 URL:', `${this.apiUrl}/auth/validate-token/${token}`);
      console.groupEnd();
      
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
    const token = localStorage.getItem('authToken');
    console.log('🔐 AUTH: getToken() - Token exists:', !!token);
    if (token) {
      console.log('🔐 AUTH: Token length:', token.length);
    }
    return token;
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  isDevelopment(): boolean {
    return this.isDevMode();
  }

  isMultiCompany(): boolean {
    const user = this.currentUser();
    return user?.tenantType === 'MULTI_COMPANY' || false;
  }

  async getUserCompanies(): Promise<any[]> {
    try {
      const user = this.currentUser();
      if (!user) return [];

      // If user has companies in user object, return them
      if (user.companies && user.companies.length > 0) {
        return user.companies;
      }

      // Otherwise fetch from API
      return await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/users/${user.id}/companies`)
      );
    } catch (error) {
      console.error('Error fetching user companies:', error);
      return [];
    }
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
    console.log('🔐 AUTH: Setting session with token:', token.substring(0, 20) + '...');
    console.log('👤 AUTH: User:', user.email, user.role);
    
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    console.log('✅ AUTH: Token saved to localStorage');
  }

  private async setCompanyContext(companyId: number): Promise<void> {
    try {
      const company = await firstValueFrom(this.companyService.getCompany(companyId));
      
      this.contextService.setCurrentCompany({
        id: company.id.toString(),
        name: company.name,
        tax_id: company.tax_id || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        is_active: company.is_active,
        created_at: company.created_at
      } as any);
      
    } catch (error) {
      // Error estableciendo contexto de empresa
    }
  }

  // Headers del usuario autenticado
  getUserHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    const user = this.currentUser();
    
    if (user) {
      headers['X-User-ID'] = user.id;
      headers['X-User-Email'] = user.email;
      headers['X-User-Role'] = user.role;
      if (user.companyId) {
        headers['X-Company-ID'] = user.companyId.toString();
      }
    }
    
    return headers;
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as NexumUser;
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
        
        // Restaurar el contexto de la empresa si el usuario tiene companyId
        if (user.companyId) {
          this.setCompanyContext(user.companyId);
        }
        
        // Restaurar el tenant si el usuario tiene tenantId
        if (user.tenantId) {
          this.contextService.setCurrentTenant({
            id: user.tenantId,
            name: user.tenantName || 'Tenant Demo',
            type: user.tenantType || 'SINGLE_COMPANY',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch {
        this.logout();
      }
    }
  }
}
