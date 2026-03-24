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
    }
    return this.http
      .get<{ inventory: InventoryItem[] }>(this.apiUrl, { params })
      .pipe(map((res) => res.inventory ?? []));
  }
}
