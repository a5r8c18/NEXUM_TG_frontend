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

  getInventory(filters?: InventoryFilters): Observable<InventoryItem[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.fromDate) params = params.set('fromDate', filters.fromDate);
      if (filters.toDate) params = params.set('toDate', filters.toDate);
      if (filters.product) params = params.set('product', filters.product);
      if (filters.expirationDate)
        params = params.set('expirationDate', filters.expirationDate);
    }
    return this.http
      .get<{ inventory: InventoryItem[] }>(this.apiUrl, { params })
      .pipe(map((res) => res.inventory ?? []));
  }
}
