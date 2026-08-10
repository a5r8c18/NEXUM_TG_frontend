import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  product?: string;
  entity?: string;
  warehouse?: string;
  document?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getReceptionReports(filters?: ReportFilters): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.document) params.append('document', filters.document);
    const query = params.toString();
    return this.http.get<any[]>(`${this.apiUrl}/reception${query ? '?' + query : ''}`);
  }

  getDeliveryReports(filters?: ReportFilters): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.document) params.append('document', filters.document);
    const query = params.toString();
    return this.http.get<any[]>(`${this.apiUrl}/delivery${query ? '?' + query : ''}`);
  }

  getTransferReports(filters?: {
    fromDate?: string;
    toDate?: string;
    product?: string;
    sourceWarehouse?: string;
    destinationWarehouse?: string;
  }): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.sourceWarehouse) params.append('sourceWarehouse', filters.sourceWarehouse);
    if (filters?.destinationWarehouse) params.append('destinationWarehouse', filters.destinationWarehouse);
    const query = params.toString();
    return this.http.get<any[]>(`${this.apiUrl}/transfers${query ? '?' + query : ''}`);
  }

  getReturnReports(filters?: ReportFilters): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.product) params.append('product', filters.product);
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.warehouse) params.append('warehouse', filters.warehouse);
    if (filters?.document) params.append('document', filters.document);
    params.append('limit', '200');
    const query = params.toString();
    return this.http.get<any[]>(`${environment.apiUrl}/warehouse-returns${query ? '?' + query : ''}`).pipe(
      map((items: any[]) =>
        (items || []).map((r: any) => ({
          id: r.id,
          isReturn: true as const,
          reportNumber: r.returnNumber,
          document: r.returnNumber,
          entity: r.supplierName || r.returnedBy || '-',
          warehouse: r.sourceWarehouseName || r.sourceWarehouseId || '-',
          reason: r.returnReason || r.notes || '-',
          category: r.category || null,
          details: {
            products: (r.items || []).map((it: any) => ({
              code: it.productCode,
              description: it.productName,
              unit: it.productUnit || 'und',
              quantity: it.quantityReturned,
              unitPrice: it.unitPrice,
              amount: it.totalPrice,
            })),
            totalAmount: r.totalAmount || 0,
          },
          created_at: r.createdAt || r.created_at,
        })),
      ),
    );
  }
}
