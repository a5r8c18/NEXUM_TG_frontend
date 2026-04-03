import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountingService, ComprobanteOperacion, JournalEntryComprobante } from '../../../../core/services/accounting.service';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './journal-entries.component.html',
})
export class JournalEntriesComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private fb = inject(FormBuilder);

  // Signals
  comprobantes = signal<ComprobanteOperacion[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  currentPage = signal(1);
  pageSize = 10;
  searchTerm = signal('');
  typeFilter = signal('');
  dateFromFilter = signal('');
  dateToFilter = signal('');
  statusFilter = signal('');
  selectedComprobante = signal<ComprobanteOperacion | null>(null);
  showEntriesDetail = signal(false);

  // Form for filters
  filterForm: FormGroup;

  // Computed properties
  filteredComprobantes = computed(() => {
    let filtered = this.comprobantes();
    
    // Search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(comp => 
        comp.description.toLowerCase().includes(term) ||
        comp.reference?.toLowerCase().includes(term) ||
        comp.documentNumber?.toLowerCase().includes(term) ||
        comp.issuer?.toLowerCase().includes(term) ||
        comp.receiver?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (this.typeFilter()) {
      filtered = filtered.filter(comp => comp.type === this.typeFilter());
    }

    // Status filter
    if (this.statusFilter()) {
      filtered = filtered.filter(comp => comp.status === this.statusFilter());
    }

    // Date filters
    if (this.dateFromFilter()) {
      filtered = filtered.filter(comp => comp.date >= this.dateFromFilter());
    }
    if (this.dateToFilter()) {
      filtered = filtered.filter(comp => comp.date <= this.dateToFilter());
    }

    return filtered;
  });

  pagedComprobantes = computed(() => {
    const filtered = this.filteredComprobantes();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  paginationConfig = computed(() => ({
    currentPage: this.currentPage(),
    totalItems: this.filteredComprobantes().length,
    itemsPerPage: this.pageSize,
    totalPages: Math.ceil(this.filteredComprobantes().length / this.pageSize),
  }));

  // Statistics
  statistics = computed(() => {
    const comps = this.comprobantes();
    const totalAmount = comps.reduce((sum, comp) => sum + comp.totalAmount, 0);

    return {
      total: comps.length,
      totalAmount,
      posted: comps.filter(c => c.status === 'posted').length,
      draft: comps.filter(c => c.status === 'draft').length,
      cancelled: comps.filter(c => c.status === 'cancelled').length
    };
  });

  constructor() {
    this.filterForm = this.fb.group({
      search: [''],
      type: [''],
      status: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    // Watch form changes
    this.filterForm.valueChanges.subscribe(values => {
      this.searchTerm.set(values.search || '');
      this.typeFilter.set(values.type || '');
      this.statusFilter.set(values.status || '');
      this.dateFromFilter.set(values.dateFrom || '');
      this.dateToFilter.set(values.dateTo || '');
      this.currentPage.set(1);
    });
  }

  ngOnInit() {
    this.loadComprobantes();
  }

  loadComprobantes() {
    this.isLoading.set(true);
    this.hasError.set(false);
    
    // TODO: Implement getComprobantes method in AccountingService
    // this.accountingService.getComprobantes().subscribe({
    //   next: (data) => {
    //     this.comprobantes.set(data);
    //     this.isLoading.set(false);
    //   },
    //   error: () => {
    //     this.hasError.set(true);
    //     this.isLoading.set(false);
    //   }
    // });
    
    // Mock data for now
    setTimeout(() => {
      this.comprobantes.set([
        {
          id: '1',
          companyId: 1,
          date: '2024-01-15',
          reference: 'FAC-001',
          description: 'Venta de mercancías',
          type: 'factura',
          status: 'posted',
          totalAmount: 1500.00,
          documentNumber: 'FAC-001',
          issuer: 'Cliente A',
          receiver: 'Mi Empresa',
          entries: [
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
            }
          ],
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15'
        }
      ]);
      this.isLoading.set(false);
    }, 1000);
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  resetFilters() {
    this.filterForm.reset();
    this.currentPage.set(1);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'factura': 'Factura',
      'recibo': 'Recibo',
      'nota_debito': 'Nota Débito',
      'nota_credito': 'Nota Crédito',
      'nomina': 'Nómina',
      'contrato': 'Contrato',
      'certificado': 'Certificado',
      'informe': 'Informe',
      'otro': 'Otro'
    };
    return labels[type] || type;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800',
      'posted': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': 'Borrador',
      'posted': 'Contabilizado',
      'cancelled': 'Anulado'
    };
    return labels[status] || status;
  }

  createComprobante() {
    // TODO: Implement create comprobante modal
    console.log('Create comprobante clicked');
  }

  editComprobante(comprobante: ComprobanteOperacion) {
    // TODO: Implement edit comprobante modal
    console.log('Edit comprobante:', comprobante);
  }

  deleteComprobante(comprobante: ComprobanteOperacion) {
    if (!confirm(`¿Eliminar el comprobante ${comprobante.reference || comprobante.id}?`)) return;
    
    // TODO: Implement deleteComprobante method
    console.log('Delete comprobante:', comprobante);
  }

  postComprobante(comprobante: ComprobanteOperacion) {
    // TODO: Implement postComprobante method
    console.log('Post comprobante:', comprobante);
  }

  cancelComprobante(comprobante: ComprobanteOperacion) {
    if (!confirm(`¿Anular el comprobante ${comprobante.reference || comprobante.id}?`)) return;
    
    // TODO: Implement cancelComprobante method
    console.log('Cancel comprobante:', comprobante);
  }

  viewEntries(comprobante: ComprobanteOperacion) {
    this.selectedComprobante.set(comprobante);
    this.showEntriesDetail.set(true);
  }

  closeEntriesDetail() {
    this.showEntriesDetail.set(false);
    this.selectedComprobante.set(null);
  }
}
