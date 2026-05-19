import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Dashboard ──
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/dashboard`);
  }

  // ── CxC ──
  getReceivables(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.customerName) params = params.set('customerName', filters.customerName);
    if (filters?.agingCategory) params = params.set('agingCategory', filters.agingCategory);
    return this.http.get(`${this.apiUrl}/finance/receivables`, { params });
  }

  getReceivableStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/receivables/statistics`);
  }

  getReceivable(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/receivables/${id}`);
  }

  createReceivable(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/receivables`, data);
  }

  // ── CxP ──
  getPayables(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.supplierName) params = params.set('supplierName', filters.supplierName);
    return this.http.get(`${this.apiUrl}/finance/payables`, { params });
  }

  getPayableStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/payables/statistics`);
  }

  createPayable(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/payables`, data);
  }

  // ── Bancos ──
  getBanks(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get(`${this.apiUrl}/finance/banks`, { params });
  }

  getBankStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/banks/statistics`);
  }

  getBank(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/banks/${id}`);
  }

  createBank(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/banks`, data);
  }

  updateBank(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/finance/banks/${id}`, data);
  }

  getBankTransactions(bankAccountId: string, filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get(`${this.apiUrl}/finance/banks/${bankAccountId}/transactions`, { params });
  }

  createBankTransaction(bankAccountId: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/banks/${bankAccountId}/transactions`, data);
  }

  // ── Pagos ──
  getPayments(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.paymentType) params = params.set('paymentType', filters.paymentType);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get(`${this.apiUrl}/finance/payments`, { params });
  }

  getPaymentStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/payments/statistics`);
  }

  createPayment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/payments`, data);
  }
}
