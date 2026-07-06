import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePurchasePayload, Purchase, PurchaseDetailResponse } from '../../models/purchase.models';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private apiUrl = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  createPurchase(data: CreatePurchasePayload, companyId?: number): Observable<Purchase> {
    return this.http.post<Purchase>(this.apiUrl, data);
  }

  getPurchases(companyId?: number): Observable<Purchase[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<Purchase[]>(this.apiUrl, { params });
  }

  getPurchaseById(id: string): Observable<PurchaseDetailResponse> {
    return this.http.get<PurchaseDetailResponse>(`${this.apiUrl}/${id}`);
  }

  registerSupplierInvoice(purchaseId: string, data: { invoiceNumber: string; invoiceDate: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${purchaseId}/invoice`, data);
  }

  reconcilePurchase(purchaseId: string, data: { purchaseOrderId?: string; deliveryNoteId?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${purchaseId}/reconcile`, data);
  }
}
