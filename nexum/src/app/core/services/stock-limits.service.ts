import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockLimit, CreateStockLimitRequest, UpdateStockLimitRequest, StockLimitWarning } from '../models/stock-limits.model';

@Injectable({
  providedIn: 'root'
})
export class StockLimitsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStockLimits(companyId?: string, warehouseId?: string): Observable<StockLimit[]> {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (warehouseId) params.append('warehouseId', warehouseId);
    
    const url = params.toString() 
      ? `${this.apiUrl}/stock-limits?${params.toString()}`
      : `${this.apiUrl}/stock-limits`;
    
    return this.http.get<StockLimit[]>(url);
  }

  getStockLimit(id: string): Observable<StockLimit> {
    return this.http.get<StockLimit>(`${this.apiUrl}/stock-limits/${id}`);
  }

  createStockLimit(limit: CreateStockLimitRequest): Observable<StockLimit> {
    return this.http.post<StockLimit>(`${this.apiUrl}/stock-limits`, limit);
  }

  updateStockLimit(id: string, limit: UpdateStockLimitRequest): Observable<StockLimit> {
    return this.http.put<StockLimit>(`${this.apiUrl}/stock-limits/${id}`, limit);
  }

  deleteStockLimit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stock-limits/${id}`);
  }

  getStockWarnings(companyId?: string, warehouseId?: string): Observable<StockLimitWarning[]> {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (warehouseId) params.append('warehouseId', warehouseId);
    
    const url = params.toString() 
      ? `${this.apiUrl}/stock-limits/warnings?${params.toString()}`
      : `${this.apiUrl}/stock-limits/warnings`;
    
    return this.http.get<StockLimitWarning[]>(url);
  }

  bulkCreateStockLimits(limits: CreateStockLimitRequest[]): Observable<StockLimit[]> {
    return this.http.post<StockLimit[]>(`${this.apiUrl}/stock-limits/bulk`, limits);
  }

  getProductsForStockLimits(companyId?: string): Observable<any[]> {
    const url = companyId 
      ? `${this.apiUrl}/products/stock-limits?companyId=${companyId}`
      : `${this.apiUrl}/products/stock-limits`;
    
    return this.http.get<any[]>(url);
  }
}
