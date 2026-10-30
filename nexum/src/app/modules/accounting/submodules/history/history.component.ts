import { Component, OnInit, WritableSignal, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AccountingService } from '../../../../core/services/accounting.service';

interface PickerOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-accounting-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  accounts = signal<any[]>([]);
  subaccounts = signal<any[]>([]);
  selectedAccount = signal<PickerOption | null>(null);
  selectedSubaccount = signal<PickerOption | null>(null);
  history = signal<any | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  openingOriginId = signal<string | null>(null);

  accountQuery = '';
  subaccountQuery = '';
  includeDrafts = false;
  accountDrop = signal(false);
  subaccountDrop = signal(false);

  accountOptions = computed<PickerOption[]>(() =>
    this.accounts()
      .filter((a) => !a.code?.includes('-') && Number(a.level) < 4)
      .filter((a) => a.allowsMovements || this.childrenOf(a.code).length > 0)
      .map((a) => ({ value: a.code, label: `${a.code} - ${a.name}` })),
  );

  subaccountOptions = computed<PickerOption[]>(() => {
    const parent = this.selectedAccount()?.value;
    if (!parent) return [];
    return this.childrenOf(parent).map((s) => ({
      value: s.code?.includes('-') ? s.code : `${parent}-${s.code}`,
      label: `${s.code} - ${s.name}`,
    }));
  });

  ngOnInit(): void {
    forkJoin({
      accounts: this.accountingService.getAccounts({ activeOnly: 'true' }),
      subaccounts: this.accountingService.getSubaccounts().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ accounts, subaccounts }) => {
        this.accounts.set(Array.isArray(accounts) ? accounts : []);
        this.subaccounts.set(Array.isArray(subaccounts) ? subaccounts : []);
        this.restoreFromUrl();
      },
      error: () => this.error.set('Error cargando las cuentas'),
    });
  }

  /** Repite la última consulta (p. ej. al volver desde el documento de origen). */
  private restoreFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const account = this.accountOptions().find((o) => o.value === params.get('account'));
    if (!account) return;
    this.selectAccount(account);
    const sub = this.subaccountOptions().find((o) => o.value === params.get('sub'));
    if (sub) this.selectSubaccount(sub);
    this.includeDrafts = params.get('drafts') === 'true';
    this.search();
  }

  private childrenOf(code: string): any[] {
    return this.subaccounts().filter((s: any) => s.parentCode === code || s.code?.startsWith(`${code}-`));
  }

  filter(options: PickerOption[], query: string): PickerOption[] {
    const q = (query || '').toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }

  closeLater(drop: WritableSignal<boolean>): void {
    setTimeout(() => drop.set(false), 150);
  }

  selectAccount(opt: PickerOption): void {
    this.selectedAccount.set(opt);
    this.accountQuery = opt.label;
    this.accountDrop.set(false);
    this.selectSubaccount(null);
    this.history.set(null);
  }

  selectSubaccount(opt: PickerOption | null): void {
    this.selectedSubaccount.set(opt);
    this.subaccountQuery = opt?.label ?? '';
    this.subaccountDrop.set(false);
  }

  search(): void {
    const account = this.selectedAccount();
    if (!account) return;
    this.isLoading.set(true);
    this.error.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        account: account.value,
        sub: this.selectedSubaccount()?.value || null,
        drafts: this.includeDrafts ? 'true' : null,
      },
      replaceUrl: true,
    });
    this.accountingService
      .getAccountHistory(account.value, this.selectedSubaccount()?.value, this.includeDrafts)
      .subscribe({
        next: (data) => {
          this.history.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err?.error?.message || 'Error consultando el historial');
        },
      });
  }

  /** Navega al documento del módulo que generó el comprobante. */
  goToOrigin(entry: any): void {
    this.openingOriginId.set(entry.voucherId);
    this.accountingService.getVoucherOrigin(entry.voucherId).subscribe({
      next: (origin) => {
        this.openingOriginId.set(null);
        this.router.navigate([origin.route], { queryParams: origin.queryParams || {} });
      },
      error: (err) => {
        this.openingOriginId.set(null);
        this.error.set(err?.error?.message || 'No se pudo determinar el origen del comprobante');
      },
    });
  }

  sourceLabel(source?: string): string {
    const labels: Record<string, string> = {
      manual: 'Manual',
      inventory: 'Inventario',
      invoices: 'Facturación',
      'fixed-assets': 'Activos Fijos',
      hr: 'Nómina',
      payroll: 'Nómina',
      finance: 'Finanzas',
    };
    return labels[source || ''] || source || '—';
  }
}
