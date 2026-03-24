import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Invoice, InvoiceItem, CreateInvoiceDto, InvoiceFilters } from '../../models/invoice.models';

export type { Invoice, InvoiceItem, CreateInvoiceDto, InvoiceFilters };

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private readonly apiUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  getInvoices(filters?: InvoiceFilters): Observable<Invoice[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.customerName) params = params.set('customerName', filters.customerName);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }
    return this.http.get<{ invoices: Invoice[] }>(this.apiUrl, { params })
      .pipe(map(response => response.invoices || []));
  }

  getInvoiceById(id: string): Observable<Invoice> {
    return this.http.get<{ invoice: Invoice }>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.invoice));
  }

  createInvoice(invoice: CreateInvoiceDto): Observable<Invoice> {
    return this.http.post<{ invoice: Invoice }>(this.apiUrl, invoice)
      .pipe(map(response => response.invoice));
  }

  updateInvoice(id: string, data: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<{ invoice: Invoice }>(`${this.apiUrl}/${id}`, data)
      .pipe(map(response => response.invoice));
  }

  deleteInvoice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: string, status: string): Observable<Invoice> {
    return this.http.put<{ invoice: Invoice }>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(map(response => response.invoice));
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  downloadPDF(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  downloadExcel(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/excel`, { responseType: 'blob' });
  }
}

