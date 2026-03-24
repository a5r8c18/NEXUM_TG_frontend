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

  getMovements(filters?: MovementFilters, companyId?: number): Observable<MovementItem[]> {
    let params = new HttpParams().set('relations', 'true');
    if (companyId) params = params.set('companyId', companyId.toString());
    if (filters) {
      if (filters.fromDate) params = params.set('start_date', filters.fromDate);
      if (filters.toDate) params = params.set('end_date', filters.toDate);
      if (filters.product) params = params.set('product_name', filters.product);
    }
    return this.http.get<MovementItem[]>(this.apiUrl, { params });
  }

  registerDirectEntry(data: DirectEntryDto, companyId?: number): Observable<any> {
    const payload = companyId ? { ...data, companyId } : data;
    return this.http.post(`${this.apiUrl}/direct-entry`, payload);
  }

  registerExit(data: ExitDto, companyId?: number): Observable<any> {
    const payload = companyId ? { ...data, companyId } : {
      product_code: data.productCode,
      quantity: data.quantity,
      reason: data.reason,
      entity: data.entity,
      warehouse: data.warehouse,
    };
    return this.http.post(`${this.apiUrl}/exit`, payload);
  }

  createReturn(purchaseId: string, reason: string, companyId?: number): Observable<any> {
    const payload = companyId ? { product_code: '', quantity: 0, purchase_id: purchaseId, reason, companyId } : {
      purchase_id: purchaseId,
      reason,
    };
    return this.http.post(`${this.apiUrl}/return`, payload);
  }
}
