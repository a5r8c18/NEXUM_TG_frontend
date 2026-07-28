import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WarehouseReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  status: 'draft' | 'pending' | 'processed' | 'cancelled';
  warehouseId: string;
  warehouseName?: string;
  returnedBy?: string;
  items: any[];
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WarehouseReturnsService {
  private apiUrl = `${environment.apiUrl}/warehouse-returns`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { status?: string; warehouseId?: string }): Observable<WarehouseReturn[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    return this.http.get<WarehouseReturn[]>(this.apiUrl, { params });
  }

  getOne(id: string): Observable<WarehouseReturn> {
    return this.http.get<WarehouseReturn>(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<WarehouseReturn> {
    return this.http.post<WarehouseReturn>(this.apiUrl, data);
  }

  process(id: string): Observable<WarehouseReturn> {
    return this.http.put<WarehouseReturn>(`${this.apiUrl}/${id}/process`, {});
  }

  cancel(id: string): Observable<WarehouseReturn> {
    return this.http.patch<WarehouseReturn>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
