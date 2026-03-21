import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovementItem, MovementFilters, DirectEntryDto, ExitDto } from '../../models/inventory.models';

@Injectable({
  providedIn: 'root',
})
export class MovementsService {
  private apiUrl = `${environment.apiUrl}/movements`;

  constructor(private http: HttpClient) {}

  getMovements(filters?: MovementFilters): Observable<MovementItem[]> {
    let params = new HttpParams().set('relations', 'true');
    if (filters) {
      if (filters.fromDate) params = params.set('start_date', filters.fromDate);
      if (filters.toDate) params = params.set('end_date', filters.toDate);
      if (filters.product) params = params.set('product_name', filters.product);
    }
    return this.http.get<MovementItem[]>(this.apiUrl, { params });
  }

  registerDirectEntry(data: DirectEntryDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/direct-entry`, data);
  }

  registerExit(data: ExitDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/exit`, {
      product_code: data.productCode,
      quantity: data.quantity,
      reason: data.reason,
      entity: data.entity,
      warehouse: data.warehouse,
    });
  }

  createReturn(purchaseId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/return`, {
      purchase_id: purchaseId,
      reason,
    });
  }
}
