import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService, Account } from '../../../core/services/accounting.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-account-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="account-selector">
      <label class="form-label">{{ label }}</label>
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          [placeholder]="placeholder"
          [(ngModel)]="searchTerm"
          (input)="onSearch()"
          (focus)="showDropdown.set(true)"
          (blur)="hideDropdown()"
        />
        <div class="input-group-text" *ngIf="selectedAccount()">
          {{ selectedAccount()?.code }}
        </div>
      </div>
      
      <!-- Dropdown con resultados -->
      <div class="dropdown-menu show" *ngIf="showDropdown() && (filteredAccounts().length > 0 || loading())">
        <div class="dropdown-header" *ngIf="loading()">
          <small class="text-muted">Buscando...</small>
        </div>
        <div class="dropdown-header" *ngIf="!loading() && filteredAccounts().length === 0">
          <small class="text-muted">No se encontraron cuentas</small>
        </div>
        <a
          class="dropdown-item"
          href="#"
          *ngFor="let account of filteredAccounts()"
          (click)="selectAccount(account); $event.preventDefault()"
        >
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>{{ account.code }}</strong>
              <span class="text-muted ms-2">{{ account.name }}</span>
            </div>
            <small class="badge bg-light text-dark">{{ account.type }}</small>
          </div>
          <div class="small text-muted" *ngIf="account.parentCode">
            Subcuenta de {{ account.parentCode }}
          </div>
        </a>
      </div>
      
      <!-- Cuenta seleccionada -->
      <div class="mt-2" *ngIf="selectedAccount()">
        <small class="text-success">
          <i class="bi bi-check-circle"></i>
          {{ selectedAccount()?.code }} - {{ selectedAccount()?.name }}
        </small>
      </div>
    </div>
  `,
  styles: [`
    .account-selector {
      position: relative;
    }
    
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1000;
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.175);
    }
    
    .dropdown-item {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #f8f9fa;
    }
    
    .dropdown-item:hover {
      background-color: #f8f9fa;
    }
    
    .dropdown-item:last-child {
      border-bottom: none;
    }
    
    .dropdown-header {
      padding: 0.5rem 1rem;
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
  `]
})
export class AccountSelectorComponent {
  @Input() label: string = 'Cuenta Contable';
  @Input() placeholder: string = 'Buscar cuenta por código o nombre...';
  @Input() accountType?: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  @Input() nature?: 'deudora' | 'acreedora';
  @Input() allowsMovementsOnly: boolean = true;
  @Input() activeOnly: boolean = true;
  
  @Output() accountSelected = new EventEmitter<Account | null>();
  
  private accountingService = inject(AccountingService);
  
  searchTerm = signal('');
  selectedAccount = signal<Account | null>(null);
  filteredAccounts = signal<Account[]>([]);
  loading = signal(false);
  showDropdown = signal(false);
  
  private searchSubject = new Subject<string>();
  
  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => this.searchAccounts(term))
    ).subscribe({
      next: (accounts) => {
        this.filteredAccounts.set(accounts);
        this.loading.set(false);
      },
      error: () => {
        this.filteredAccounts.set([]);
        this.loading.set(false);
      }
    });
  }
  
  onSearch(): void {
    const term = this.searchTerm();
    this.loading.set(true);
    this.searchSubject.next(term);
  }
  
  private searchAccounts(term: string) {
    const filters: any = {
      search: term,
      activeOnly: this.activeOnly ? 'true' : 'false',
    };

    if (this.allowsMovementsOnly === true) {
      filters.allowsMovements = 'true';
    }

    if (this.accountType) {
      filters.type = this.accountType;
    }

    if (this.nature) {
      filters.nature = this.nature;
    }

    return this.accountingService.getAccounts(filters);
  }
  
  selectAccount(account: Account): void {
    console.log(`🔹 [AccountSelector] Cuenta seleccionada: ${account.code} - ${account.name} (${this.label})`);
    this.selectedAccount.set(account);
    this.searchTerm.set(`${account.code} - ${account.name}`);
    this.showDropdown.set(false);
    console.log(`🔹 [AccountSelector] Emitiendo accountSelected con:`, account);
    this.accountSelected.emit(account);
  }
  
  hideDropdown(): void {
    setTimeout(() => this.showDropdown.set(false), 200);
  }
  
  clearSelection(): void {
    this.selectedAccount.set(null);
    this.searchTerm.set('');
    this.accountSelected.emit(null);
  }
}