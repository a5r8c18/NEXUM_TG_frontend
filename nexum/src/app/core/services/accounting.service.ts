import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface JournalEntry {
  id: string;
  companyId: number;
  entryNumber: string;
  date: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  reference: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  createdBy: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  nature: 'deudora' | 'acreedora';
  level: number;
  groupNumber: string | null;
  parentCode: string | null;
  parentAccountId: string | null;
  balance: number;
  isActive: boolean;
  allowsMovements: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Account[];
}

export interface AccountFilters {
  type?: string;
  search?: string;
  nature?: string;
  level?: string;
  groupNumber?: string;
  activeOnly?: string;
}

export interface AccountStatistics {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  byNature: Record<string, number>;
  byLevel: Record<number, number>;
}

export interface JournalEntryComprobante {
  id: string;
  voucherId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  createdAt: string;
}

export interface ComprobanteOperacion {
  id: string;
  companyId: number;
  date: string;
  reference?: string;
  description: string;
  type: 'factura' | 'recibo' | 'nota_debito' | 'nota_credito' | 'nomina' | 'contrato' | 'certificado' | 'informe' | 'otro';
  status: 'draft' | 'posted' | 'cancelled';
  totalAmount: number;
  documentNumber?: string;
  issuer?: string;
  receiver?: string;
  entries: JournalEntryComprobante[];
  createdAt: string;
  updatedAt: string;
}

export interface CostCenter {
  id: string;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  type: 'production' | 'administrative' | 'sales' | 'maintenance' | 'research' | 'marketing' | 'general';
  manager: string | null;
  budget: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenterFilters {
  type?: string;
  search?: string;
  activeOnly?: string;
}

export interface CostCenterStatistics {
  total: number;
  active: number;
  byType: Record<string, number>;
  totalBudget: number;
}

export interface AccountingReport {
  id: string;
  type: string;
  title: string;
  date: string;
  description: string;
  generatedBy: string;
  generatedAt: string;
  fileSize: string;
  downloadUrl: string;
  data: any[];
}

export interface ReportFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  accountCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounting`;

  getEntries(filters?: { status?: string; fromDate?: string; toDate?: string }) {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.fromDate) params.fromDate = filters.fromDate;
    if (filters?.toDate) params.toDate = filters.toDate;
    return this.http.get<JournalEntry[]>(`${this.baseUrl}/entries`, { params });
  }

  getEntryStatistics() {
    return this.http.get<any>(`${this.baseUrl}/entries/statistics`);
  }

  createEntry(data: Partial<JournalEntry>) {
    return this.http.post<JournalEntry>(`${this.baseUrl}/entries`, data);
  }

  updateEntryStatus(id: string, status: string) {
    return this.http.put<JournalEntry>(`${this.baseUrl}/entries/${id}/status`, { status });
  }

  deleteEntry(id: string) {
    return this.http.delete(`${this.baseUrl}/entries/${id}`);
  }

  getAccounts(filters?: AccountFilters) {
    const params: any = {};
    if (filters?.type) params.type = filters.type;
    if (filters?.search) params.search = filters.search;
    if (filters?.nature) params.nature = filters.nature;
    if (filters?.level) params.level = filters.level;
    if (filters?.groupNumber) params.groupNumber = filters.groupNumber;
    if (filters?.activeOnly) params.activeOnly = filters.activeOnly;
    return this.http.get<Account[]>(`${this.baseUrl}/accounts`, { params });
  }

  getAccountStatistics() {
    return this.http.get<AccountStatistics>(`${this.baseUrl}/accounts/statistics`);
  }

  createAccount(data: Partial<Account>) {
    return this.http.post<Account>(`${this.baseUrl}/accounts`, data);
  }

  updateAccount(id: string, data: Partial<Account>) {
    return this.http.put<Account>(`${this.baseUrl}/accounts/${id}`, data);
  }

  deleteAccount(id: string) {
    return this.http.delete(`${this.baseUrl}/accounts/${id}`);
  }

  // Cost Centers
  getCostCenters(filters?: CostCenterFilters) {
    const params: any = {};
    if (filters?.type) params.type = filters.type;
    if (filters?.search) params.search = filters.search;
    if (filters?.activeOnly) params.activeOnly = filters.activeOnly;
    return this.http.get<CostCenter[]>(`${this.baseUrl}/cost-centers`, { params });
  }

  getCostCenterStatistics() {
    return this.http.get<CostCenterStatistics>(`${this.baseUrl}/cost-centers/statistics`);
  }

  createCostCenter(data: Partial<CostCenter>) {
    return this.http.post<CostCenter>(`${this.baseUrl}/cost-centers`, data);
  }

  updateCostCenter(id: string, data: Partial<CostCenter>) {
    return this.http.put<CostCenter>(`${this.baseUrl}/cost-centers/${id}`, data);
  }

  deleteCostCenter(id: string) {
    return this.http.delete(`${this.baseUrl}/cost-centers/${id}`);
  }
}
