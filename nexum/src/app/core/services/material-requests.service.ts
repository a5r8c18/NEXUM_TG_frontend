import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MaterialRequest {
  id: string;
  requestNumber: string;
  requestDate: string;
  status: 'draft' | 'pending' | 'approved' | 'delivered' | 'rejected' | 'cancelled';
  purpose: string;
  warehouseId: string;
  warehouseName?: string;
  departmentId?: string;
  requesterName?: string;
  items: any[];
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MaterialRequestsService {
  private apiUrl = `${environment.apiUrl}/material-requests`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { status?: string; warehouseId?: string }): Observable<MaterialRequest[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    return this.http.get<MaterialRequest[]>(this.apiUrl, { params });
  }

  getOne(id: string): Observable<MaterialRequest> {
    return this.http.get<MaterialRequest>(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<MaterialRequest> {
    return this.http.post<MaterialRequest>(this.apiUrl, data);
  }

  approve(id: string, data?: any): Observable<MaterialRequest> {
    return this.http.put<MaterialRequest>(`${this.apiUrl}/${id}/approve`, data || {});
  }

  deliver(id: string): Observable<MaterialRequest> {
    return this.http.put<MaterialRequest>(`${this.apiUrl}/${id}/deliver`, {});
  }

  reject(id: string, notes?: string): Observable<MaterialRequest> {
    return this.http.put<MaterialRequest>(`${this.apiUrl}/${id}/reject`, { notes });
  }

  cancel(id: string): Observable<MaterialRequest> {
    return this.http.patch<MaterialRequest>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
