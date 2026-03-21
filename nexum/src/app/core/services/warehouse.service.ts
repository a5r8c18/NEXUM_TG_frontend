import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '../models/warehouse.model';

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getWarehouses(companyId?: string): Observable<Warehouse[]> {
    const url = companyId 
      ? `${this.apiUrl}/companies/${companyId}/warehouses`
      : `${this.apiUrl}/warehouses`;
    return this.http.get<Warehouse[]>(url);
  }

  getWarehouse(id: string): Observable<Warehouse> {
    return this.http.get<Warehouse>(`${this.apiUrl}/warehouses/${id}`);
  }

  createWarehouse(warehouse: CreateWarehouseRequest): Observable<Warehouse> {
    return this.http.post<Warehouse>(`${this.apiUrl}/warehouses`, warehouse);
  }

  updateWarehouse(id: string, warehouse: UpdateWarehouseRequest): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${this.apiUrl}/warehouses/${id}`, warehouse);
  }

  deleteWarehouse(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/warehouses/${id}`);
  }

  activateWarehouse(id: string): Observable<Warehouse> {
    return this.http.patch<Warehouse>(`${this.apiUrl}/warehouses/${id}/activate`, {});
  }

  deactivateWarehouse(id: string): Observable<Warehouse> {
    return this.http.patch<Warehouse>(`${this.apiUrl}/warehouses/${id}/deactivate`, {});
  }
}