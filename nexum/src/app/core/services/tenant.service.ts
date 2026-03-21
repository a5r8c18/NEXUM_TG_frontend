import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '../models/tenant.model';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.apiUrl}/tenants`);
  }

  getTenant(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.apiUrl}/tenants/${id}`);
  }

  createTenant(tenant: CreateTenantRequest): Observable<Tenant> {
    return this.http.post<Tenant>(`${this.apiUrl}/tenants`, tenant);
  }

  updateTenant(id: string, tenant: UpdateTenantRequest): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.apiUrl}/tenants/${id}`, tenant);
  }

  deleteTenant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tenants/${id}`);
  }

  activateTenant(id: string): Observable<Tenant> {
    return this.http.patch<Tenant>(`${this.apiUrl}/tenants/${id}/activate`, {});
  }

  deactivateTenant(id: string): Observable<Tenant> {
    return this.http.patch<Tenant>(`${this.apiUrl}/tenants/${id}/deactivate`, {});
  }
}