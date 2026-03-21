import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  entity?: string;
  warehouse?: string;
  document?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getReceptionReports(filters?: ReportFilters): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.document) params.append('document', filters.document);
    const query = params.toString();
    return this.http.get<any[]>(`${this.apiUrl}/reception${query ? '?' + query : ''}`);
  }

  getDeliveryReports(filters?: ReportFilters): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.document) params.append('document', filters.document);
    const query = params.toString();
    return this.http.get<any[]>(`${this.apiUrl}/delivery${query ? '?' + query : ''}`);
  }
}
