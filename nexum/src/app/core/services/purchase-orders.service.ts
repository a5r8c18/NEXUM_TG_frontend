import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  private readonly apiUrl = `${environment.apiUrl}/purchase-orders`;

  constructor(private http: HttpClient) {}

  getAll(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.supplierName) params = params.set('supplierName', filters.supplierName);
    return this.http.get(this.apiUrl, { params });
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  getOne(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  submit(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/submit`, {});
  }

  approve(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/reject`, { reason });
  }

  cancel(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/cancel`, {});
  }
}
