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
    if (filters?.concept) params = params.set('concept', filters.concept);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    return this.http.get(this.apiUrl, { params });
  }

  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  generateFree(data: { period: string; startDate: string; endDate: string; items: { employeeId: string; amount: number; description?: string }[]; processedBy?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate/libre`, data);
  }

  generateManual(data: {
    concept: string;
    period: string;
    startDate: string;
    endDate: string;
    items: { employeeId: string; days: number; hours?: number; nightHours?: number; grossSalary?: number }[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate/manual`, data);
  }

  /** Tarifas del pago adicional por nocturnidad de la empresa, en CUP por hora. */
  updateNightShiftRates(rates: { nightShiftRateEvening: number; nightShiftRateNight: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/night-shift-rates`, rates);
  }

  /** Cuenta de Nóminas por Pagar y las subcuentas que la empresa le creó. */
  getPayableSubaccounts(): Observable<{ account: string; subaccounts: { code: string; name: string }[] }> {
    return this.http.get<{ account: string; subaccounts: { code: string; name: string }[] }>(
      `${this.apiUrl}/payable-subaccounts`,
    );
  }

  /**
   * Mismo cálculo que la generación pero sin persistir: tarifa aplicable,
   * importe sugerido por la ley, acumulado de vacaciones y advertencias.
   */
  previewManual(data: {
    concept: string;
    period: string;
    startDate: string;
    endDate: string;
    items: { employeeId: string; days: number; hours?: number; nightHours?: number; grossSalary?: number }[];
  }): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/generate/manual/preview`, data);
  }

  /** Catálogo de conceptos con unidad de medida y tarifas de nocturnidad. */
  getConceptCatalog(): Observable<any> {
    return this.http.get(`${this.apiUrl}/concepts`);
  }

  process(id: number, processedBy: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/process`, { processedBy });
  }

  markAsPaid(id: number, bankAccountId?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/pay`, { bankAccountId });
  }

  cancel(id: number, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  updateItems(id: number, items: any[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/items`, { items });
  }

  exportPdf(
    id: number,
    unit: 'dias' | 'horas' = 'dias',
    groupBy: 'area' | 'costCenterAccount' | 'none' = 'area',
  ): Observable<Blob> {
    let params = new HttpParams().set('unit', unit).set('groupBy', groupBy);
    return this.http.get(`${this.apiUrl}/${id}/export/pdf`, { params, responseType: 'blob' });
  }
}
