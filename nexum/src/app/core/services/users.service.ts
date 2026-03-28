import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContextService } from './context.service';

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
  password: string;
  role?: string;
  companyId: number;
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
  ) {}

  // Obtener usuarios de una empresa
  getUsersByCompany(companyId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users?companyId=${companyId}`);
  }

  // Obtener usuario por ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  // Crear nuevo usuario
  createUser(userData: CreateUserRequest): Observable<User> {
    const headers = this.contextService.getContextHeaders();
    return this.http.post<User>(`${this.apiUrl}/users`, userData, { headers });
  }

  // Actualizar usuario
  updateUser(id: string, userData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, userData);
  }

  // Eliminar usuario (desactivar)
  deleteUser(id: string): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/users/${id}`);
  }

  // Reactivar usuario
  reactivateUser(id: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/${id}/reactivate`, {});
  }

  // Cambiar contraseña
  changePassword(id: string, newPassword: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/${id}/change-password`, {
      newPassword,
    });
  }
}
