import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovementItem, MovementFilters, DirectEntryDto, ExitDto, TransferDto, ReturnDto, MovementTypeOption } from '../../models/inventory.models';

export type { TransferDto } from '../../models/inventory.models';

export interface TransferFilters {
  start_date?: string;
  end_date?: string;
  type?: 'incoming' | 'outgoing';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MovementsService {
  private apiUrl = `${environment.apiUrl}/movements`;

  constructor(private http: HttpClient) {}

  getMovements(filters?: MovementFilters & { warehouse?: string; movement_type?: string }, companyId?: number): Observable<MovementItem[]> {
    let params = new HttpParams().set('relations', 'true');
    if (companyId) params = params.set('companyId', companyId.toString());
    if (filters) {
      if (filters.fromDate) params = params.set('start_date', filters.fromDate);
      if (filters.toDate) params = params.set('end_date', filters.toDate);
      if (filters.product) params = params.set('product_name', filters.product);
      if (filters.warehouse) params = params.set('warehouse', filters.warehouse);
      if (filters.movement_type) params = params.set('movement_type', filters.movement_type);
    }
    return this.http.get<MovementItem[]>(this.apiUrl, { params });
  }

  getMovementsPaginated(
    filters?: MovementFilters & { warehouse?: string; movement_type?: string },
    page = 1,
    limit = 15,
    companyId?: number,
  ): Observable<PaginatedResponse<MovementItem>> {
    let params = new HttpParams()
      .set('relations', 'true')
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (companyId) params = params.set('companyId', companyId.toString());
    if (filters) {
      if (filters.fromDate) params = params.set('start_date', filters.fromDate);
      if (filters.toDate) params = params.set('end_date', filters.toDate);
      if (filters.product) params = params.set('product_name', filters.product);
      if (filters.warehouse) params = params.set('warehouse', filters.warehouse);
      if (filters.movement_type) params = params.set('movement_type', filters.movement_type);
    }
    return this.http.get<PaginatedResponse<MovementItem>>(this.apiUrl, { params });
  }

  registerDirectEntry(data: DirectEntryDto & { warehouseId: string }, companyId?: number): Observable<any> {
    const payload = companyId ? { ...data, companyId } : data;
    return this.http.post(`${this.apiUrl}/direct-entry`, payload);
  }

  registerExit(data: ExitDto, companyId?: number): Observable<any> {
    const payload = companyId ? { ...data, companyId } : data;
    return this.http.post(`${this.apiUrl}/exit`, payload);
  }

  createTransfer(data: TransferDto, companyId?: number): Observable<any> {
    const payload = companyId ? { ...data, companyId } : data;
    return this.http.post(`${this.apiUrl}/transfer`, payload);
  }

  createReturn(data: ReturnDto, companyId?: number): Observable<any> {
    const payload = companyId ? { ...data, companyId } : data;
    return this.http.post(`${this.apiUrl}/return`, payload);
  }

  getTransfersByWarehouse(warehouseId: string, filters?: TransferFilters, companyId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (filters) {
      if (filters.start_date) params = params.set('start_date', filters.start_date);
      if (filters.end_date) params = params.set('end_date', filters.end_date);
      if (filters.type) params = params.set('type', filters.type);
    }
    return this.http.get<any[]>(`${this.apiUrl}/transfers/${warehouseId}`, { params });
  }

  getMovementTypes(direction?: 'entry' | 'exit', category?: string): Observable<MovementTypeOption[]> {
    let params = new HttpParams();
    if (direction) params = params.set('direction', direction);
    if (category) params = params.set('category', category);
    return this.http.get<MovementTypeOption[]>(`${this.apiUrl}/types`, { params });
  }
}
