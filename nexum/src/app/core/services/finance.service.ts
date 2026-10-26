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

  // ── Conceptos de contrapartida ──
  getCounterpartConcepts(direction?: 'income' | 'expense'): Observable<any> {
    let params = new HttpParams();
    if (direction) params = params.set('direction', direction);
    return this.http.get(`${this.apiUrl}/finance/counterpart-concepts`, { params });
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

  updateReceivable(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/finance/receivables/${id}`, data);
  }

  // ── CxP ──
  getPayables(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.supplierName) params = params.set('supplierName', filters.supplierName);
    return this.http.get(`${this.apiUrl}/finance/payables`, { params });
  }

  getPayable(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/payables/${id}`);
  }

  getPayableStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/payables/statistics`);
  }

  createPayable(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/payables`, data);
  }

  updatePayable(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/finance/payables/${id}`, data);
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

  getAllBankTransactions(type?: string): Observable<any> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get(`${this.apiUrl}/finance/bank-transactions`, { params });
  }

  createBankTransaction(bankAccountId: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/banks/${bankAccountId}/transactions`, data);
  }

  updateBankTransaction(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/finance/bank-transactions/${id}`, data);
  }

  deleteBankTransaction(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/finance/bank-transactions/${id}`);
  }

  // ── Clientes / Entidades ──
  getCustomers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/customers`);
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/customers`, data);
  }

  updateCustomer(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/finance/customers/${id}`, data);
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/finance/customers/${id}`);
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

  // ── Caja (Efectivo - Cuenta 101) ──
  getCashRegisters(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/cash-registers`);
  }

  getCashStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/cash-registers/statistics`);
  }

  getCashRegister(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/cash-registers/${id}`);
  }

  createCashRegister(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/cash-registers`, data);
  }

  updateCashRegister(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/finance/cash-registers/${id}`, data);
  }

  openCashRegister(id: string, openingBalance?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/cash-registers/${id}/open`, { openingBalance });
  }

  closeCashRegister(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/cash-registers/${id}/close`, {});
  }

  performCashAudit(id: string, physicalBalance: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/cash-registers/${id}/audit`, { physicalBalance });
  }

  depositToBank(id: string, bankAccountId: string, amount: number, description?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/cash-registers/${id}/deposit-to-bank`, {
      bankAccountId,
      amount,
      description,
    });
  }

  getCashMovements(cashRegisterId: string, filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    if (filters?.movementType) params = params.set('movementType', filters.movementType);
    return this.http.get(`${this.apiUrl}/finance/cash-registers/${cashRegisterId}/movements`, { params });
  }

  createCashMovement(cashRegisterId: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance/cash-registers/${cashRegisterId}/movements`, data);
  }
}