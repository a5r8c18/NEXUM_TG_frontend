import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePurchasePayload, Purchase } from '../../models/purchase.models';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private apiUrl = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  createPurchase(data: CreatePurchasePayload, companyId?: number): Observable<Purchase> {
    const payload = companyId ? { ...data, companyId } : data;
    return this.http.post<Purchase>(this.apiUrl, payload);
  }

  getPurchases(companyId?: number): Observable<Purchase[]> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<Purchase[]>(this.apiUrl, { params });
  }
}
