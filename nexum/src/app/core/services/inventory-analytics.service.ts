import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventoryAnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/inventory-analytics`;

  constructor(private http: HttpClient) {}

  getRotationAnalytics(filters?: { warehouseId?: string; category?: string; period?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.period) params = params.set('period', String(filters.period));
    return this.http.get(`${this.apiUrl}/rotation`, { params });
  }

  getSlowMoving(filters?: { warehouseId?: string; category?: string; minDays?: number }): Observable<any> {
    let params = new HttpParams();
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.minDays) params = params.set('minDays', String(filters.minDays));
    return this.http.get(`${this.apiUrl}/slow-moving`, { params });
  }
}
