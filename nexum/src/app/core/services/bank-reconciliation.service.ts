import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type ReconciliationStatus = 'reconciled' | 'difference' | 'corrected';

export interface BankReconciliation {
  id: string;
  companyId: number;
  statementNumber?: string | null;
  bankAccountId: string;
  bankAccount?: any;
  company?: { name: string; taxId: string };
  reconciliationDate: string;
  statementBalance: number;
  bookBalance: number;
  adjustedStatementBalance: number;
  adjustedBookBalance: number;
  difference: number;
  status: ReconciliationStatus;
  depositsInTransit: number;
  outstandingChecks: number;
  bankCharges: number;
  interestEarned: number;
  notes: string | null;
  reconciledBy: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class BankReconciliationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  reconciliations = signal<BankReconciliation[]>([]);
  currentReconciliation = signal<BankReconciliation | null>(null);
  isLoading = signal(false);

  findAll(bankAccountId?: string) {
    this.isLoading.set(true);
    const url = bankAccountId 
      ? `${this.apiUrl}/finance/reconciliations?bankAccountId=${bankAccountId}`
      : `${this.apiUrl}/finance/reconciliations`;
    return this.http.get<BankReconciliation[]>(url);
  }

  findOne(id: string) {
    this.isLoading.set(true);
    return this.http.get<BankReconciliation>(`${this.apiUrl}/finance/reconciliations/${id}`);
  }

  create(data: Partial<BankReconciliation>) {
    return this.http.post<BankReconciliation>(`${this.apiUrl}/finance/reconciliations`, data);
  }

  complete(id: string) {
    return this.http.patch<BankReconciliation>(`${this.apiUrl}/finance/reconciliations/${id}/complete`, {});
  }
}
