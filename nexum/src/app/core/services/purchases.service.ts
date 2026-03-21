import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePurchasePayload, Purchase } from '../../models/purchase.models';

@Injectable({
  providedIn: 'root',
})
export class PurchasesService {
  private apiUrl = `${environment.apiUrl}/purchases`;

  constructor(private http: HttpClient) {}

  createPurchase(data: CreatePurchasePayload): Observable<Purchase> {
    return this.http.post<Purchase>(this.apiUrl, data);
  }

  getPurchases(): Observable<Purchase[]> {
    return this.http.get<Purchase[]>(this.apiUrl);
  }
}
