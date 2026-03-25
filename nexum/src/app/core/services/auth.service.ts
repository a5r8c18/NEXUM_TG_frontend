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
  role: 'superadmin' | 'admin' | 'user';
  tenantId: string;
  tenantName: string;
  tenantType: 'MULTI_COMPANY' | 'SINGLE_COMPANY';
  avatarUrl?: string;
  currentCompanyId?: number;
  companyId?: number; // ✅ Añadir companyId para compatibilidad con backend
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
        console.log('🔍 AUTH SERVICE - Usuario tiene companyId:', response.user.companyId);
        if (response.user.companyId) {
          await this.setCompanyContext(response.user.companyId);
        } else {
          console.warn('⚠️ AUTH SERVICE - Usuario no tiene companyId asignado');
          // Para usuarios sin empresa, no establecer contexto
        }
        
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

  private async setCompanyContext(companyId: number): Promise<void> {
    try {
      console.log('🔍 AUTH SERVICE - Estableciendo contexto de empresa:', companyId);
      const company = await firstValueFrom(this.companyService.getCompany(companyId));
      console.log('✅ AUTH SERVICE - Empresa obtenida:', company.name);
      
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
      
      console.log('✅ AUTH SERVICE - Contexto de empresa establecido');
    } catch (error) {
      console.error('❌ AUTH SERVICE - Error estableciendo contexto de empresa:', error);
    }
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
          console.log('🔄 AUTH SERVICE - Restaurando contexto de empresa:', user.companyId);
          this.setCompanyContext(user.companyId);
        }
      } catch {
        this.logout();
      }
    }
  }
}
