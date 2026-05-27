import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed';

export interface Budget {
  id: string;
  companyId: number;
  name: string;
  description: string | null;
  year: number;
  status: BudgetStatus;
  totalAmount: number;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  accountCode: string;
  accountName: string;
  month: number | null;
  plannedAmount: number;
  actualAmount: number;
  deviation: number;
  notes: string | null;
  createdAt: string;
}

export interface BudgetExecution {
  budget: Budget;
  lines: BudgetLine[];
  totalPlanned: number;
  totalActual: number;
  totalDeviation: number;
  deviationPercentage: number;
}

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  budgets = signal<Budget[]>([]);
  currentBudget = signal<Budget | null>(null);
  execution = signal<BudgetExecution | null>(null);
  isLoading = signal(false);

  findAll(year?: number) {
    this.isLoading.set(true);
    const url = year ? `${this.apiUrl}/budgets?year=${year}` : `${this.apiUrl}/budgets`;
    return this.http.get<Budget[]>(url);
  }

  findOne(id: string) {
    this.isLoading.set(true);
    return this.http.get<Budget>(`${this.apiUrl}/budgets/${id}`);
  }

  getExecution(id: string) {
    this.isLoading.set(true);
    return this.http.get<BudgetExecution>(`${this.apiUrl}/budgets/${id}/execution`);
  }

  create(data: Partial<Budget> & { lines?: Partial<BudgetLine>[] }) {
    return this.http.post<Budget>(`${this.apiUrl}/budgets`, data);
  }

  addLine(budgetId: string, data: Partial<BudgetLine>) {
    return this.http.post<BudgetLine>(`${this.apiUrl}/budgets/${budgetId}/lines`, data);
  }

  approve(id: string) {
    return this.http.patch<Budget>(`${this.apiUrl}/budgets/${id}/approve`, {});
  }

  deleteBudget(id: string) {
    return this.http.delete(`${this.apiUrl}/budgets/${id}`);
  }
}
