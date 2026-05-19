import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly apiUrl = `${environment.apiUrl}/payroll`;

  constructor(private http: HttpClient) {}

  getAll(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.period) params = params.set('period', filters.period);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    return this.http.get(this.apiUrl, { params });
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  getOne(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  process(id: number, processedBy: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/process`, { processedBy });
  }

  markAsPaid(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/pay`, {});
  }
}
