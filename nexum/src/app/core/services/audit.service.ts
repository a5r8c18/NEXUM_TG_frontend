import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditLog {
  id: string;
  companyId: number | null;
  company?: { id: number; name: string } | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  resourceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  endpoint: string | null;
  method: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  success: boolean;
  errorMessage: string | null;
  sessionId: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AuditLogFilters {
  companyId?: number;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  fromDate?: string;
  toDate?: string;
  success?: boolean;
}

export interface AuditStatistics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByResource: Record<string, number>;
  actionsByUser: Array<{ userName: string; count: number }>;
  successRate: number;
  averageDuration: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private apiUrl = `${environment.apiUrl}/audit`;

  constructor(private http: HttpClient) {}

  private buildParams(filters?: AuditLogFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;

    if (filters.companyId) params = params.set('companyId', filters.companyId.toString());
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.action) params = params.set('action', filters.action);
    if (filters.resource) params = params.set('resource', filters.resource);
    if (filters.resourceId) params = params.set('resourceId', filters.resourceId);
    if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters.toDate) params = params.set('toDate', filters.toDate);
    if (filters.success !== undefined) params = params.set('success', filters.success.toString());

    return params;
  }

  // Logs de la empresa en contexto (cualquier usuario autenticado)
  getLogs(filters?: AuditLogFilters): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs`, {
      params: this.buildParams(filters),
    });
  }

  // Logs de TODAS las empresas (solo superadmin)
  getAllLogs(filters?: AuditLogFilters): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs-all`, {
      params: this.buildParams(filters),
    });
  }

  getUserLogs(userId: string, limit = 100): Observable<AuditLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<AuditLog[]>(`${this.apiUrl}/logs/user/${userId}`, { params });
  }

  getStatistics(fromDate?: string, toDate?: string): Observable<AuditStatistics> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<AuditStatistics>(`${this.apiUrl}/statistics`, { params });
  }
}
