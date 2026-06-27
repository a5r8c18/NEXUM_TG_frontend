import { Component, EventEmitter, Input, Output, inject, signal, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService, Account } from '../../../core/services/accounting.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-account-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" #container>
      <label class="block text-xs font-semibold text-slate-700 mb-1">{{ label }}</label>

      <!-- Input -->
      <div class="relative">
        <input
          #inputEl
          type="text"
          [placeholder]="placeholder"
          [(ngModel)]="searchTermStr"
          (ngModelChange)="onSearchChange($event)"
          (focus)="onFocus()"
          (blur)="hideDropdown()"
          class="w-full px-3 py-2.5 pr-8 border-2 border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400
                 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
          [class.border-emerald-400]="selectedAccount()"
          autocomplete="off"
        />
        <!-- Indicador cuenta seleccionada / limpiar -->
        @if (selectedAccount()) {
          <button type="button" (mousedown)="clearSelection()"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-emerald-500 hover:text-slate-500 transition-colors"
                  title="Limpiar selección">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        } @else if (loading()) {
          <div class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        } @else {
          <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        }
      </div>

      <!-- Cuenta seleccionada (badge) -->
      @if (selectedAccount()) {
        <div class="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
          <svg class="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-xs text-emerald-700 font-medium truncate">
            {{ selectedAccount()!.code }} — {{ selectedAccount()!.name }}
          </span>
        </div>
      }

      <!-- Dropdown — usa position:fixed para escapar cualquier overflow:hidden -->
      @if (showDropdown() && (filteredAccounts().length > 0 || loading() || searchTermStr.length >= 2)) {
        <div class="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
             [style.top.px]="dropdownTop"
             [style.left.px]="dropdownLeft"
             [style.width.px]="dropdownWidth">

          <!-- Estado cargando -->
          @if (loading()) {
            <div class="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <div class="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              Buscando cuentas...
            </div>
          }

          <!-- Sin resultados -->
          @if (!loading() && filteredAccounts().length === 0 && searchTermStr.length >= 2) {
            <div class="px-4 py-3 text-sm text-slate-400 italic">No se encontraron cuentas</div>
          }

          <!-- Resultados -->
          @if (!loading() && filteredAccounts().length > 0) {
            <div class="max-h-64 overflow-y-auto divide-y divide-slate-100">
              @for (account of filteredAccounts(); track account.id) {
                <div class="flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50 cursor-pointer transition-colors group"
                     (mousedown)="selectAccount(account)">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                        {{ account.code }}
                      </span>
                      <span class="text-sm text-slate-700 truncate">{{ account.name }}</span>
                    </div>
                    @if (account.parentCode) {
                      <div class="text-[10px] text-slate-400 mt-0.5 ml-0.5">Subcuenta de {{ account.parentCode }}</div>
                    }
                  </div>
                  <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                        [class]="getNatureClass(account.nature)">
                    {{ account.nature === 'deudora' ? 'D' : 'A' }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AccountSelectorComponent implements OnDestroy {
  @Input() label: string = 'Cuenta Contable';
  @Input() placeholder: string = 'Buscar cuenta por código o nombre...';
  @Input() accountType?: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  @Input() nature?: 'deudora' | 'acreedora';
  @Input() allowsMovementsOnly: boolean = true;
  @Input() activeOnly: boolean = true;

  @Output() accountSelected = new EventEmitter<Account | null>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('container') containerEl!: ElementRef<HTMLDivElement>;

  private accountingService = inject(AccountingService);

  searchTermStr = '';
  selectedAccount = signal<Account | null>(null);
  filteredAccounts = signal<Account[]>([]);
  loading = signal(false);
  showDropdown = signal(false);

  dropdownTop = 0;
  dropdownLeft = 0;
  dropdownWidth = 280;

  private searchSubject = new Subject<string>();
  private sub = this.searchSubject.pipe(
    debounceTime(280),
    distinctUntilChanged(),
    switchMap(term => {
      if (term.length < 1) { this.filteredAccounts.set([]); this.loading.set(false); return []; }
      return this.searchAccounts(term);
    })
  ).subscribe({
    next: (accounts) => { this.filteredAccounts.set(accounts as Account[]); this.loading.set(false); },
    error: () => { this.filteredAccounts.set([]); this.loading.set(false); }
  });

  ngOnDestroy() { this.sub.unsubscribe(); }

  onFocus(): void {
    this.updateDropdownPosition();
    this.showDropdown.set(true);
    if (this.searchTermStr.length >= 1) {
      this.loading.set(true);
      this.searchSubject.next(this.searchTermStr);
    }
  }

  onSearchChange(term: string): void {
    this.searchTermStr = term;
    this.updateDropdownPosition();
    this.showDropdown.set(true);
    if (term.length < 1) {
      this.filteredAccounts.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.searchSubject.next(term);
  }

  private updateDropdownPosition(): void {
    const el = this.inputEl?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.dropdownTop = rect.bottom + 4;
    this.dropdownLeft = rect.left;
    this.dropdownWidth = rect.width;
  }

  private searchAccounts(term: string) {
    const filters: any = { search: term, activeOnly: this.activeOnly ? 'true' : 'false' };
    if (this.allowsMovementsOnly) filters.allowsMovements = 'true';
    if (this.accountType) filters.type = this.accountType;
    if (this.nature) filters.nature = this.nature;
    return this.accountingService.getAccounts(filters);
  }

  selectAccount(account: Account): void {
    this.selectedAccount.set(account);
    this.searchTermStr = `${account.code} — ${account.name}`;
    this.showDropdown.set(false);
    this.filteredAccounts.set([]);
    this.accountSelected.emit(account);
  }

  hideDropdown(): void {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  clearSelection(): void {
    this.selectedAccount.set(null);
    this.searchTermStr = '';
    this.filteredAccounts.set([]);
    this.showDropdown.set(false);
    this.accountSelected.emit(null);
  }

  getNatureClass(nature: string): string {
    return nature === 'deudora'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-cyan-100 text-cyan-700';
  }
}