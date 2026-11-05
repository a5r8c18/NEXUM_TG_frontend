import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditService, AuditLog } from '../../core/services/audit.service';
import { CompanyService } from '../../core/services/company.service';
import { ThemeService } from '../../core/services/theme.service';
import { Company } from '../../models/company.models';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.component.html'
})
export class AuditLogsComponent implements OnInit {
  private auditService = inject(AuditService);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  public themeService = inject(ThemeService);

  logs = signal<AuditLog[]>([]);
  companies = signal<Company[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  expandedLogs = signal<Set<string>>(new Set());

  // Filtros
  companyFilter = signal<string>('ALL');
  actionFilter = signal<string>('ALL');
  resourceFilter = signal<string>('ALL');
  successFilter = signal<string>('ALL');
  userSearch = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');

  readonly actions = [
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'READ',
    'EXPORT', 'APPROVE', 'REJECT', 'TRANSFER', 'ENTRY', 'EXIT', 'RETURN'
  ];

  readonly resources = [
    'USER', 'COMPANY', 'INVOICE', 'PURCHASE', 'INVENTORY', 'MOVEMENT',
    'WAREHOUSE', 'REPORT', 'FIXED_ASSET', 'AUTH', 'SYSTEM', 'VOUCHER',
    'ACCOUNT', 'FISCAL_YEAR', 'ACCOUNTING_PERIOD'
  ];

  // Paginación
  currentPage = signal(1);
  pageSize = 15;

  filteredLogs = computed(() => {
    const search = this.userSearch().trim().toLowerCase();
    if (!search) return this.logs();
    return this.logs().filter(log =>
      (log.userName || '').toLowerCase().includes(search) ||
      (log.userEmail || '').toLowerCase().includes(search)
    );
  });

  paginatedLogs = computed(() => {
    const filtered = this.filteredLogs();
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  });

  paginationConfig = computed(() => {
    const totalItems = this.filteredLogs().length;
    const totalPages = Math.ceil(totalItems / this.pageSize);
    return {
      currentPage: this.currentPage(),
      totalItems,
      totalPages,
      itemsPerPage: this.pageSize,
      hasNextPage: this.currentPage() < totalPages,
      hasPreviousPage: this.currentPage() > 1
    };
  });

  pageNumbers = computed(() => {
    const { totalPages, currentPage } = this.paginationConfig();
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const pages = [];
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  });

  pageRange = computed(() => {
    const config = this.paginationConfig();
    const start = (config.currentPage - 1) * config.itemsPerPage + 1;
    const end = Math.min(config.currentPage * config.itemsPerPage, config.totalItems);
    return { start, end };
  });

  successCount = computed(() => this.filteredLogs().filter(l => l.success).length);
  errorCount = computed(() => this.filteredLogs().filter(l => !l.success).length);

  ngOnInit() {
    this.loadCompanies();
    this.loadLogs();
  }

  async loadCompanies() {
    try {
      const data = await firstValueFrom(this.companyService.getCompanies());
      this.companies.set(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }

  async loadLogs() {
    this.isLoading.set(true);
    this.hasError.set(false);

    try {
      const filters: any = {};
      if (this.companyFilter() !== 'ALL') filters.companyId = parseInt(this.companyFilter(), 10);
      if (this.actionFilter() !== 'ALL') filters.action = this.actionFilter();
      if (this.resourceFilter() !== 'ALL') filters.resource = this.resourceFilter();
      if (this.successFilter() !== 'ALL') filters.success = this.successFilter() === 'true';
      if (this.fromDate()) filters.fromDate = this.fromDate();
      if (this.toDate()) filters.toDate = `${this.toDate()}T23:59:59`;

      const data = await firstValueFrom(this.auditService.getAllLogs(filters));
      this.logs.set(data);
      this.currentPage.set(1);
      this.expandedLogs.set(new Set());
    } catch (error) {
      console.error('Error loading audit logs:', error);
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters() {
    this.companyFilter.set('ALL');
    this.actionFilter.set('ALL');
    this.resourceFilter.set('ALL');
    this.successFilter.set('ALL');
    this.userSearch.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.loadLogs();
  }

  onUserSearchChange(value: string) {
    this.userSearch.set(value);
    this.currentPage.set(1);
  }

  toggleLogExpansion(logId: string) {
    const expanded = new Set(this.expandedLogs());
    if (expanded.has(logId)) {
      expanded.delete(logId);
    } else {
      expanded.add(logId);
    }
    this.expandedLogs.set(expanded);
  }

  isLogExpanded(logId: string): boolean {
    return this.expandedLogs().has(logId);
  }

  // Paginación
  onPageChange(page: number) { this.currentPage.set(page); }
  goToPreviousPage() {
    if (this.paginationConfig().hasPreviousPage) this.currentPage.set(this.currentPage() - 1);
  }
  goToNextPage() {
    if (this.paginationConfig().hasNextPage) this.currentPage.set(this.currentPage() + 1);
  }
  goToFirstPage() { this.currentPage.set(1); }
  goToLastPage() { this.currentPage.set(this.paginationConfig().totalPages); }

  // Utilidades
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  formatJson(value: Record<string, any> | null): string {
    return value ? JSON.stringify(value, null, 2) : '—';
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'CREATE': case 'ENTRY': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'UPDATE': case 'TRANSFER': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'DELETE': case 'EXIT': case 'RETURN': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'LOGIN': case 'LOGOUT': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'APPROVE': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'REJECT': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      case 'EXPORT': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  }

  getRoleLabel(role: string | null): string {
    switch (role) {
      case 'superadmin': return 'Superadmin';
      case 'admin': return 'Admin';
      case 'user': return 'Usuario';
      case 'facturador': return 'Facturador';
      default: return role || '—';
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  // Tema
  get backgroundThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'bg-gradient-to-br from-slate-50 to-slate-100'
      : 'bg-gradient-to-br from-slate-900 to-slate-800';
  }

  get cardThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'bg-white border border-slate-200'
      : 'bg-white/10 backdrop-blur-md border border-slate-700';
  }

  get textThemeClasses(): string {
    return this.themeService.currentTheme() === 'light' ? 'text-slate-900' : 'text-white';
  }

  get subTextThemeClasses(): string {
    return this.themeService.currentTheme() === 'light' ? 'text-slate-700' : 'text-slate-400';
  }

  get tableHeaderThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'bg-slate-50 text-slate-700 border-slate-200'
      : 'bg-slate-800/50 text-slate-300 border-slate-700';
  }

  get tableRowThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'hover:bg-slate-50 border-slate-200'
      : 'hover:bg-slate-700/50 border-slate-700';
  }

  get inputThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
      : 'bg-white/5 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  }

  get labelThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'text-sm font-medium text-slate-700'
      : 'text-sm font-medium text-slate-300';
  }

  get buttonThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'bg-blue-600 hover:bg-blue-700 text-white'
      : 'bg-blue-500 hover:bg-blue-600 text-white';
  }

  get backButtonThemeClasses(): string {
    return this.themeService.currentTheme() === 'light'
      ? 'text-slate-600 hover:text-slate-900'
      : 'text-white/60 hover:text-white';
  }
}
