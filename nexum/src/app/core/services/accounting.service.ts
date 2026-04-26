import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


export interface Elemento {
  id: string;
  companyId: number;
  entryNumber: string;
  date: string;
  description: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  subaccountCode?: string | null;
  subaccountName?: string | null;
  element: string;
  elementDescription?: string | null;
  debit: number;
  credit: number;
  lineDescription?: string | null;
  costCenterId?: string | null;
  costCenter?: CostCenter;
  reference?: string | null;
  type: string;
  status: 'draft' | 'posted' | 'cancelled';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface ExpenseType {
  id: string;
  companyId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountStatistics {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  byNature: Record<string, number>;
  byLevel: Record<number, number>;
}

export interface Subaccount {
  id: string;
  companyId: number;
  accountId: string;
  account?: Account;
  subaccountCode: string;
  subaccountName: string;
  description: string | null;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  nature: 'deudora' | 'acreedora';
  balance: number;
  isActive: boolean;
  allowsMovements: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubaccountStatistics {
  total: number;
  active: number;
  inactive: number;
  byAccount: Record<string, number>;
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
  entries: any[];
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

export interface Voucher {
  id: string;
  companyId: number;
  voucherNumber: string;
  date: string;
  description: string;
  type: 'factura' | 'recibo' | 'nota_debito' | 'nota_credito' | 'nomina' | 'depreciacion' | 'ajuste' | 'apertura' | 'cierre' | 'otro';
  status: 'draft' | 'posted' | 'cancelled';
  totalAmount: number;
  sourceModule: 'inventory' | 'invoices' | 'fixed-assets' | 'hr' | 'manual';
  sourceDocumentId: string | null;
  reference: string | null;
  periodId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines: VoucherLineItem[];
}

export interface VoucherLineItem {
  id: string;
  voucherId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  subaccountCode?: string | null;
  subaccountName?: string | null;
  element?: string | null;
  elementName?: string | null;
  subelement?: string | null;
  subelementName?: string | null;
  debit: number;
  credit: number;
  description: string | null;
  costCenterId: string | null;
  costCenter?: CostCenter;
  reference: string | null;
  lineOrder: number;
  voucher?: Voucher;
}

export interface VoucherFilters {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sourceModule?: string;
  search?: string;
}

export interface VoucherLineFilters {
  accountCode?: string;
  costCenterId?: string;
  fromDate?: string;
  toDate?: string;
  voucherId?: string;
  search?: string;
}

export interface VoucherStatistics {
  total: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

export interface VoucherLineStatistics {
  totalLines: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface FiscalYear {
  id: string;
  companyId: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  periods: AccountingPeriod[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountingPeriod {
  id: string;
  companyId: number;
  fiscalYearId: string;
  name: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  closedAt: string | null;
  closedBy: string | null;
}

export interface AccountElement {
  type: string;
  label: string;
  nature: string;
  accountCount: number;
  activeCount: number;
  totalBalance: number;
  accounts: Account[];
}

export interface ReportFilters {
  type?: string;
  fromDate?: string;
  toDate?: string;
  accountCode?: string;
  asOfDate?: string;
}

@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounting`;

  // ── Accounts (Chart of Accounts) ──

  getAccounts(filters?: {
    type?: string;
    search?: string;
    nature?: string;
    level?: string;
    groupNumber?: string;
    activeOnly?: string;
    allowsMovements?: string;
  }) {
    const params: any = {};
    if (filters?.type) params.type = filters.type;
    if (filters?.search) params.search = filters.search;
    if (filters?.nature) params.nature = filters.nature;
    if (filters?.level) params.level = filters.level;
    if (filters?.groupNumber) params.groupNumber = filters.groupNumber;
    if (filters?.activeOnly) params.activeOnly = filters.activeOnly;
    if (filters?.allowsMovements) params.allowsMovements = filters.allowsMovements;
    return this.http.get<Account[]>(`${this.baseUrl}/accounts`, { params });
  }

  getAccountsByParentCode(parentCode: string) {
    return this.http.get<Account[]>(`${this.baseUrl}/accounts/${parentCode}/subaccounts`);
  }

  

  getAccountStatistics() {
    return this.http.get<AccountStatistics>(`${this.baseUrl}/accounts/statistics`);
  }

  createAccount(data: Partial<Account>) {
    return this.http.post<Account>(`${this.baseUrl}/accounts`, data);
  }

  createSubaccount(data: {
    accountId: string;
    subaccountCode: string;
    subaccountName: string;
    description?: string;
  }) {
    return this.http.post<Subaccount>(`${this.baseUrl}/subaccounts`, data);
  }

  getSubaccounts(accountId?: string) {
    const params: any = {};
    if (accountId) params.accountId = accountId;
    return this.http.get<Subaccount[]>(`${this.baseUrl}/subaccounts`, { params });
  }

  getSubaccountsByAccount(accountId: string) {
    return this.http.get<Subaccount[]>(`${this.baseUrl}/subaccounts/${accountId}`);
  }

  getSubaccountStatistics() {
    return this.http.get<SubaccountStatistics>(`${this.baseUrl}/subaccounts/statistics`);
  }

  getSubaccount(id: string) {
    return this.http.get<Subaccount>(`${this.baseUrl}/subaccounts/${id}`);
  }

  updateSubaccount(id: string, data: Partial<Subaccount>) {
    return this.http.put<Subaccount>(`${this.baseUrl}/subaccounts/${id}`, data);
  }

  toggleSubaccountActive(id: string) {
    return this.http.patch<Subaccount>(`${this.baseUrl}/subaccounts/${id}/toggle-active`, {});
  }

  deleteSubaccount(id: string) {
    return this.http.delete(`${this.baseUrl}/subaccounts/${id}`);
  }

  updateAccount(id: string, data: Partial<Account>) {
    return this.http.put<Account>(`${this.baseUrl}/accounts/${id}`, data);
  }

  deleteAccount(id: string) {
    return this.http.delete(`${this.baseUrl}/accounts/${id}`);
  }

  // ── Vouchers (Comprobantes) ──

  getVouchers(filters?: VoucherFilters) {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    if (filters?.dateFrom) params.fromDate = filters.dateFrom;
    if (filters?.dateTo) params.toDate = filters.dateTo;
    if (filters?.sourceModule) params.sourceModule = filters.sourceModule;
    if (filters?.search) params.search = filters.search;
    return this.http.get<Voucher[]>(`${this.baseUrl}/vouchers`, { params });
  }

  getVoucherStatistics() {
    return this.http.get<VoucherStatistics>(`${this.baseUrl}/vouchers/statistics`);
  }

  getVoucher(id: string) {
    return this.http.get<Voucher>(`${this.baseUrl}/vouchers/${id}`);
  }

  createVoucher(data: any) {
    return this.http.post<Voucher>(`${this.baseUrl}/vouchers`, data);
  }

  updateVoucher(id: string, data: any) {
    return this.http.put<Voucher>(`${this.baseUrl}/vouchers/${id}`, data);
  }

  updateVoucherStatus(id: string, status: string) {
    return this.http.put<Voucher>(`${this.baseUrl}/vouchers/${id}/status`, { status });
  }

  deleteVoucher(id: string) {
    return this.http.delete(`${this.baseUrl}/vouchers/${id}`);
  }

  // ── Voucher Lines (Partidas) ──

  getVoucherLines(filters?: VoucherLineFilters) {
    const params: any = {};
    if (filters?.accountCode) params.accountCode = filters.accountCode;
    if (filters?.costCenterId) params.costCenterId = filters.costCenterId;
    if (filters?.fromDate) params.fromDate = filters.fromDate;
    if (filters?.toDate) params.toDate = filters.toDate;
    if (filters?.voucherId) params.voucherId = filters.voucherId;
    if (filters?.search) params.search = filters.search;
    return this.http.get<VoucherLineItem[]>(`${this.baseUrl}/voucher-lines`, { params });
  }

  getVoucherLineStatistics() {
    return this.http.get<VoucherLineStatistics>(`${this.baseUrl}/voucher-lines/statistics`);
  }

  // ── Cost Centers ──

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

  // ── Fiscal Years ──

  getFiscalYears() {
    return this.http.get<FiscalYear[]>(`${this.baseUrl}/fiscal-years`);
  }

  getFiscalYear(id: string) {
    return this.http.get<FiscalYear>(`${this.baseUrl}/fiscal-years/${id}`);
  }

  createFiscalYear(data: { name: string; startDate: string; endDate: string }) {
    return this.http.post<FiscalYear>(`${this.baseUrl}/fiscal-years`, data);
  }

  closeFiscalYear(id: string) {
    return this.http.patch<FiscalYear>(`${this.baseUrl}/fiscal-years/${id}/close`, {});
  }

  // ── Accounting Periods ──

  getPeriods(fiscalYearId?: string) {
    const params: any = {};
    if (fiscalYearId) params.fiscalYearId = fiscalYearId;
    return this.http.get<AccountingPeriod[]>(`${this.baseUrl}/periods`, { params });
  }

  closePeriod(id: string) {
    return this.http.patch<AccountingPeriod>(`${this.baseUrl}/periods/${id}/close`, {});
  }

  reopenPeriod(id: string) {
    return this.http.patch<AccountingPeriod>(`${this.baseUrl}/periods/${id}/reopen`, {});
  }

  // ── Elements (Agrupación por Tipo) ──

  getElements() {
    return this.http.get<AccountElement[]>(`${this.baseUrl}/elements`);
  }

  // ── Reports (Informes Contables) ──

  getTrialBalance(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get<any[]>(`${this.baseUrl}/reports/trial-balance`, { params });
  }

  getBalanceSheet(asOfDate?: string) {
    const params: any = {};
    if (asOfDate) params.asOfDate = asOfDate;
    return this.http.get<any>(`${this.baseUrl}/reports/balance-sheet`, { params });
  }

  getIncomeStatement(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get<any>(`${this.baseUrl}/reports/income-statement`, { params });
  }

  getExpenseBreakdown(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get<any>(`${this.baseUrl}/reports/expense-breakdown`, { params });
  }

  getGeneralLedger(accountCode: string, fromDate?: string, toDate?: string) {
    const params: any = { accountCode };
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get<any>(`${this.baseUrl}/reports/general-ledger`, { params });
  }

  getGeneralJournal(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get<any>(`${this.baseUrl}/reports/general-journal`, { params });
  }

  getCostCenterAnalysis(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get<any[]>(`${this.baseUrl}/reports/cost-center-analysis`, { params });
  }

  getFinancialKPIs() {
    return this.http.get<any>(`${this.baseUrl}/kpis`);
  }

  // ── Modelos SIEN (5920 / 5921) ──

  exportModelo5920Excel(asOfDate?: string) {
    const params: any = {};
    if (asOfDate) params.asOfDate = asOfDate;
    return this.http.get(`${this.baseUrl}/reports/modelo-5920/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportModelo5921Excel(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get(`${this.baseUrl}/reports/modelo-5921/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportModelo5924Excel(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get(`${this.baseUrl}/reports/modelo-5924/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportTrialBalanceExcel(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get(`${this.baseUrl}/reports/trial-balance/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportBalanceSheetExcel(asOfDate?: string) {
    const params: any = {};
    if (asOfDate) params.asOfDate = asOfDate;
    return this.http.get(`${this.baseUrl}/reports/balance-sheet/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportIncomeStatementExcel(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get(`${this.baseUrl}/reports/income-statement/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  exportExpenseBreakdownExcel(fromDate?: string, toDate?: string) {
    const params: any = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    return this.http.get(`${this.baseUrl}/reports/modelo-5924/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  // ================================
  // JOURNAL ENTRIES (Partidas Independientes)
  // ================================

  
  // ================================
  
  // ================================
  // ELEMENTOS (Elementos de Gastos)
  // ================================

  getElementos(filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
    accountCode?: string;
    search?: string;
  }) {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.fromDate) params.fromDate = filters.fromDate;
    if (filters?.toDate) params.toDate = filters.toDate;
    if (filters?.accountCode) params.accountCode = filters.accountCode;
    if (filters?.search) params.search = filters.search;
    return this.http.get<Elemento[]>(`${this.baseUrl}/elementos`, { params });
  }

  getElemento(id: string) {
    return this.http.get<Elemento>(`${this.baseUrl}/elementos/${id}`);
  }

  getElementoStatistics() {
    return this.http.get<any>(`${this.baseUrl}/elementos/statistics`);
  }

  createElemento(data: {
    date: string;
    description: string;
    accountCode: string;
    subaccountCode?: string;
    entryNumber?: string;
    element: string;
    elementDescription?: string;
    debit?: number;
    credit?: number;
    lineDescription?: string;
    costCenterId?: string;
    reference?: string;
    type?: string;
    createdBy?: string;
  }) {
    return this.http.post<Elemento>(`${this.baseUrl}/elementos`, data);
  }

  updateElemento(id: string, data: {
    date?: string;
    description?: string;
    accountCode?: string;
    subaccountCode?: string;
    entryNumber?: string;
    element?: string;
    elementDescription?: string;
    debit?: number;
    credit?: number;
    lineDescription?: string;
    costCenterId?: string;
    reference?: string;
  }) {
    return this.http.put<Elemento>(`${this.baseUrl}/elementos/${id}`, data);
  }

  updateElementoStatus(id: string, status: 'posted' | 'cancelled') {
    return this.http.patch<Elemento>(`${this.baseUrl}/elementos/${id}/status`, { status });
  }

  deleteElemento(id: string) {
    return this.http.delete(`${this.baseUrl}/elementos/${id}`);
  }

  // ================================
  // EXPENSE TYPES (Tipos de Partidas)
  // ================================

  getExpenseTypes() {
    return this.http.get<ExpenseType[]>(`${this.baseUrl}/expense-types`);
  }

  seedExpenseTypes() {
    return this.http.post(`${this.baseUrl}/expense-types/seed`, {});
  }

  createExpenseType(data: { code: string; name: string; description?: string }) {
    return this.http.post<ExpenseType>(`${this.baseUrl}/expense-types`, data);
  }
}
