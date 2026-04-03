import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, JournalEntryComprobante } from '../../../../core/services/accounting.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-partidas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './partidas.component.html',
})
export class PartidasComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);

  // Signals
  partidas = signal<JournalEntryComprobante[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  accountFilter = signal('');
  dateFromFilter = signal('');
  dateToFilter = signal('');

  // Form for filters
  filterForm: FormGroup;

  // Computed properties
  filteredPartidas = computed(() => {
    let filtered = this.partidas();
    
    // Search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(partida => 
        partida.description.toLowerCase().includes(term) ||
        partida.accountName.toLowerCase().includes(term) ||
        partida.accountCode.toLowerCase().includes(term)
      );
    }

    // Account filter
    if (this.accountFilter()) {
      filtered = filtered.filter(partida => partida.accountCode === this.accountFilter());
    }

    // Date filters
    if (this.dateFromFilter()) {
      filtered = filtered.filter(partida => partida.createdAt >= this.dateFromFilter());
    }
    if (this.dateToFilter()) {
      filtered = filtered.filter(partida => partida.createdAt <= this.dateToFilter());
    }

    return filtered;
  });

  pagedPartidas = computed(() => {
    const filtered = this.filteredPartidas();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredPartidas().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredPartidas().length / this.pageSize),
  }));

  // Statistics
  statistics = computed(() => {
    const partidas = this.partidas();
    const totalDebit = partidas.reduce((sum, partida) => sum + partida.debitAmount, 0);
    const totalCredit = partidas.reduce((sum, partida) => sum + partida.creditAmount, 0);
    const balance = totalDebit - totalCredit;

    return {
      total: partidas.length,
      totalDebit,
      totalCredit,
      balance,
      isBalanced: Math.abs(balance) < 0.01
    };
  });

  // Unique accounts for filter
  uniqueAccounts = computed(() => {
    const accounts = new Map();
    this.partidas().forEach(partida => {
      if (!accounts.has(partida.accountCode)) {
        accounts.set(partida.accountCode, partida.accountName);
      }
    });
    return Array.from(accounts.entries()).map(([code, name]) => ({ code, name }));
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      account: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    // Watch form changes
    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.accountFilter.set(values.account || '');
      this.dateFromFilter.set(values.dateFrom || '');
      this.dateToFilter.set(values.dateTo || '');
      this.currentPage.set(1);
    });
  }

  ngOnInit() {
    this.loadPartidas();
  }

  loadPartidas() {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    // TODO: Implement getPartidas method in AccountingService
    // this.accountingService.getPartidas().subscribe({
    //   next: (data) => {
    //     this.partidas.set(data);
    //     this.isLoading.set(false);
    //   },
    //   error: () => {
    //     this.hasError.set(true);
    //     this.isLoading.set(false);
    //   }
    // });
    
    // Mock data for now
    setTimeout(() => {
      this.partidas.set([
        {
          id: '1',
          voucherId: '1',
          accountCode: '101',
          accountName: 'Caja',
          debitAmount: 1500.00,
          creditAmount: 0,
          description: 'Venta de mercancías',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          voucherId: '1',
          accountCode: '401',
          accountName: 'Ventas',
          debitAmount: 0,
          creditAmount: 1500.00,
          description: 'Venta de mercancías',
          createdAt: '2024-01-15'
        },
        {
          id: '3',
          voucherId: '2',
          accountCode: '201',
          accountName: 'Proveedores',
          debitAmount: 0,
          creditAmount: 800.00,
          description: 'Compra de insumos',
          createdAt: '2024-01-16'
        },
        {
          id: '4',
          voucherId: '2',
          accountCode: '601',
          accountName: 'Compras',
          debitAmount: 800.00,
          creditAmount: 0,
          description: 'Compra de insumos',
          createdAt: '2024-01-16'
        }
      ]);
      this.isLoading.set(false);
    }, 100);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  resetFilters() {
    this.filterForm.reset();
    this.currentPage.set(1);
  }

  createPartida() {
    // TODO: Implement create partida modal
    console.log('Create partida clicked');
  }

  editPartida(partida: JournalEntryComprobante) {
    // TODO: Implement edit partida modal
    console.log('Edit partida:', partida);
  }

  deletePartida(partida: JournalEntryComprobante) {
    if (!confirm(`¿Eliminar la partida ${partida.accountCode} - ${partida.accountName}?`)) return;
    
    // TODO: Implement deletePartida method
    console.log('Delete partida:', partida);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  }

  // Helper methods for template
  abs(value: number): number {
    return Math.abs(value);
  }
}
