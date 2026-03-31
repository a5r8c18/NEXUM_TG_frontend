import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContextService } from './context.service';
import { AuthService } from './auth.service';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  companyId: number;
  company?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  companyId: number;
}

export interface CreateUserResponse {
  user: User;
  setupToken: string;
  setupUrl: string;
}

export interface UserCompany {
  id: string;
  userId: string;
  companyId: number;
  company: any;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignCompaniesRequest {
  companyIds: number[];
  role?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private contextService: ContextService,
    private authService: AuthService,
  ) {}

  // Obtener usuarios de una empresa
  getUsersByCompany(companyId: number): Observable<User[]> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.get<User[]>(`${this.apiUrl}/users?companyId=${companyId}`, { headers });
  }

  // Obtener usuario por ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  // Crear nuevo usuario
  createUser(userData: CreateUserRequest): Observable<CreateUserResponse> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.post<CreateUserResponse>(`${this.apiUrl}/users`, userData, { headers });
  }

  // Actualizar usuario
  updateUser(id: string, userData: UpdateUserRequest): Observable<User> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, userData, { headers });
  }

  // Eliminar usuario (desactivar)
  deleteUser(id: string): Observable<User> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.delete<User>(`${this.apiUrl}/users/${id}`, { headers });
  }

  // Reactivar usuario
  reactivateUser(id: string): Observable<User> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.post<User>(`${this.apiUrl}/users/${id}/reactivate`, {}, { headers });
  }

  // Cambiar contraseña
  changePassword(id: string, newPassword: string): Observable<User> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.post<User>(`${this.apiUrl}/users/${id}/change-password`, {
      newPassword,
    }, { headers });
  }

  // Asignar empresas a un usuario
  assignCompaniesToUser(userId: string, request: AssignCompaniesRequest): Observable<UserCompany[]> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.post<UserCompany[]>(`${this.apiUrl}/users/${userId}/companies`, request, { headers });
  }

  // Obtener empresas asignadas a un usuario
  getUserCompanies(userId: string): Observable<UserCompany[]> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.get<UserCompany[]>(`${this.apiUrl}/users/${userId}/companies`, { headers });
  }

  // Revocar acceso a una empresa
  revokeCompanyAccess(userId: string, companyId: number): Observable<{ message: string }> {
    // Combinar headers del contexto y del usuario autenticado
    const contextHeaders = this.contextService.getContextHeaders();
    const userHeaders = this.authService.getUserHeaders();
    const allHeaders = { ...contextHeaders, ...userHeaders };
    
    const headers = new HttpHeaders(allHeaders);
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${userId}/companies/${companyId}`, { headers });
  }
}
