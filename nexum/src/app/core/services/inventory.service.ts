import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InventoryItem, InventoryFilters } from '../../models/inventory.models';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) {}

  getInventory(filters?: InventoryFilters, companyId?: number): Observable<InventoryItem[]> {
    console.log('📦 INVENTORY SERVICE - Obteniendo inventario:', {
      filters,
      companyId,
      apiUrl: this.apiUrl
    });
    
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (filters) {
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      if (filters.product) params = params.set('product', filters.product);
      if (filters.entity) params = params.set('entity', filters.entity);
      if (filters.warehouse) params = params.set('warehouse', filters.warehouse);
      if (filters.minStock) params = params.set('minStock', filters.minStock.toString());
      if (filters.maxStock) params = params.set('maxStock', filters.maxStock.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    }
    
    console.log('📦 INVENTORY SERVICE - Parámetros finales:', params.toString());
    
    return this.http
      .get<any[] | { inventory: any[] }>(this.apiUrl, { params })
      .pipe(map((res) => {
        // El backend devuelve un array plano; se admite también { inventory: [] } por compatibilidad
        const raw = Array.isArray(res) ? res : (res?.inventory ?? []);
        // La entidad expone warehouseName; la tabla usa el campo warehouse
        const items: InventoryItem[] = raw.map((it) => ({
          ...it,
          warehouse: it.warehouse ?? it.warehouseName,
        }));
        console.log('✅ INVENTORY SERVICE - Respuesta recibida:', {
          totalItems: items.length,
          data: res
        });
        return items;
      }));
  }

  getSubledger(warehouseId: string, productCode: string, companyId: number): Observable<any> {
    const params = new HttpParams().set('companyId', companyId.toString());
    return this.http.get(`${environment.apiUrl}/inventory-warehouse/subledger/${warehouseId}/${productCode}`, { params });
  }
}
