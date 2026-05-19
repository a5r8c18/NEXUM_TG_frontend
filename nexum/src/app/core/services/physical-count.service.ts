import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PhysicalCountService {
  private readonly apiUrl = `${environment.apiUrl}/physical-count`;

  constructor(private http: HttpClient) {}

  getAll(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
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

  startCount(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/start`, {});
  }

  updateItem(id: string, itemId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/items/${itemId}`, data);
  }

  completeCount(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/complete`, {});
  }

  approveCount(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, {});
  }

  cancelCount(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/cancel`, {});
  }
}
