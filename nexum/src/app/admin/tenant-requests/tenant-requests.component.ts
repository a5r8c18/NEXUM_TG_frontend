import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { TenantRequestService } from '../../core/services/tenant-request.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { TenantRequest, TenantType } from '../../core/models/tenant-request.model';

@Component({
  selector: 'app-tenant-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-requests.component.html'
})
export class TenantRequestsComponent implements OnInit, OnDestroy {
  private tenantRequestService = inject(TenantRequestService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);

  requests = signal<TenantRequest[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  selectedRequest = signal<TenantRequest | null>(null);
  showApprovalModal = signal(false);
  showRejectionModal = signal(false);
  rejectionReason = signal('');
  adminNotes = signal('');
  expandedRequests = signal<Set<string>>(new Set());

  // Paginación
  currentPage = signal(1);
  pageSize = 10;

  // Ocultar botón "Volver al Dashboard" para el CEO
  shouldShowDashboardButton = computed(() => {
    const currentUser = this.authService.currentUser();
    return currentUser?.email !== 'ceo@gmail.com';
  });

  // Filtros
  statusFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'DENIED'>('ALL');
  typeFilter = signal<'ALL' | 'MULTI_COMPANY' | 'SINGLE_COMPANY'>('ALL');

  // Propiedades computadas para filtrado y paginación
  filteredRequests = computed(() => {
    let filtered = this.requests();

    // Aplicar filtros
    if (this.statusFilter() !== 'ALL') {
      filtered = filtered.filter(req => req.status === this.statusFilter());
    }

    if (this.typeFilter() !== 'ALL') {
      filtered = filtered.filter(req => req.tenantType === this.typeFilter());
    }

    return filtered;
  });

  // Resetear página cuando cambian los filtros
  onFilterChange() {
    this.currentPage.set(1);
  }

  paginatedRequests = computed(() => {
    const filtered = this.filteredRequests();
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return filtered.slice(startIndex, endIndex);
  });

  paginationConfig = computed(() => {
    const totalItems = this.filteredRequests().length;
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

  private retryCount = 0;
  private maxRetries = 2;
  private authSubscription: Subscription | null = null;

  ngOnInit() {
    // Usar enfoque reactivo con RxJS en lugar de timeouts
    this.authSubscription = this.authService.waitForAuth().subscribe({
      next: (authState) => {
        console.log('TenantRequests: Usuario autenticado, cargando solicitudes...');
        this.loadRequests();
      },
      error: (error) => {
        console.error('TenantRequests: Error esperando autenticación:', error);
        this.hasError.set(true);
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async loadRequests() {
    this.isLoading.set(true);
    this.hasError.set(false);

    try {
      const data = await firstValueFrom(this.tenantRequestService.getRequests()) as TenantRequest[];
      this.requests.set(data);
      this.retryCount = 0;
    } catch (error) {
      console.error('Error loading requests:', error instanceof Error ? error.message : String(error));
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`TenantRequests: Reintentando carga (${this.retryCount}/${this.maxRetries}) en ${500 * this.retryCount}ms...`);
        setTimeout(() => this.loadRequests(), 500 * this.retryCount);
        return;
      }
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  
  get pendingCount(): number {
    return this.requests().filter(r => r.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.requests().filter(r => r.status === 'APPROVED').length;
  }

  get rejectedCount(): number {
    return this.requests().filter(r => r.status === 'DENIED').length;
  }

  // Acciones sobre solicitudes
  viewRequest(request: TenantRequest) {
    this.selectedRequest.set(request);
  }

  openApprovalModal(request: TenantRequest) {
    this.selectedRequest.set(request);
    this.showApprovalModal.set(true);
    this.adminNotes.set('');
  }

  openRejectionModal(request: TenantRequest) {
    this.selectedRequest.set(request);
    this.showRejectionModal.set(true);
    this.rejectionReason.set('');
    this.adminNotes.set('');
  }

  debugClick() {
    console.log('🔍🔍🔍 BUTTON CLICKED!');
  }

  async approveRequest() {
    console.log('🔍🔍🔍 COMPONENT - approveRequest method STARTED!');
    const selectedReq = this.selectedRequest();
    console.log('🔍 COMPONENT - Selected request:', selectedReq);
    if (!selectedReq) {
      console.log('🔍 COMPONENT - No selected request, returning');
      return;
    }

    try {
      console.log('🔍 COMPONENT - About to call service approveRequest with ID:', selectedReq.id);
      const result = await firstValueFrom(this.tenantRequestService.approveRequest(
        selectedReq.id,  // Pass ID instead of email
        this.adminNotes() || undefined
      ));
      console.log('🔍 COMPONENT - Service call completed, result:', result);
      
      if (result) {
        console.log('✅ COMPONENT - Service call completed, result:', result);
        
        // Mostrar mensaje de éxito con enlace de registro
        const frontendUrl = 'http://localhost:4200';
        const signupUrl = `${frontendUrl}/signup?token=${result.token}`;
        
        await this.confirmDialog.alert({
          title: 'Solicitud aprobada',
          message: `✅ Solicitud aprobada exitosamente!

📧 Email: ${result.email}
🔗 Enlace de registro: ${signupUrl}

El usuario puede usar este enlace para completar su registro.`,
          confirmText: 'Aceptar',
          type: 'success'
        });

        await this.loadRequests(); // Recargar lista
        this.closeModals();
      } else {
        // Actualizar la solicitud localmente
        const updated = this.requests().map(r => 
          r.id === selectedReq.id  // Compare by ID instead of email
            ? { ...r, status: 'APPROVED' as const, reviewedAt: new Date(), adminNotes: this.adminNotes() }
            : r
        );
        this.requests.set(updated);
      }
      this.closeModals();
    } catch (error: unknown) {
      console.error('Error approving request:', error instanceof Error ? error.message : String(error));
    }
  }

  async rejectRequest() {
    console.log('🔍 COMPONENT - rejectRequest method called!');
    const selectedReq = this.selectedRequest();
    console.log('🔍 COMPONENT - Selected request:', selectedReq);
    if (!selectedReq || !this.rejectionReason()) {
      console.log('🔍 COMPONENT - No selected request or rejection reason, returning');
      return;
    }

    try {
      console.log('🔍 COMPONENT - Calling service rejectRequest with ID:', selectedReq.id);
      await firstValueFrom(this.tenantRequestService.rejectRequest(
        selectedReq.id,  // Pass ID instead of email
        this.rejectionReason(),
        this.adminNotes() || undefined
      ));
      
      // Actualizar la solicitud localmente
      const updated = this.requests().map(r => 
        r.id === selectedReq.id  // Compare by ID instead of email
          ? { 
              ...r, 
              status: 'DENIED' as const, 
              reviewedAt: new Date(), 
              rejectionReason: this.rejectionReason(),
              adminNotes: this.adminNotes()
            }
          : r
      );
      this.requests.set(updated);
      
      this.closeModals();
    } catch (error) {
      console.error('Error rejecting request:', error instanceof Error ? error.message : String(error));
    }
  }

  closeModals() {
    this.showApprovalModal.set(false);
    this.showRejectionModal.set(false);
    this.selectedRequest.set(null);
    this.rejectionReason.set('');
    this.adminNotes.set('');
  }

  // Utilidades
  getTenantTypeName(type: 'MULTI_COMPANY' | 'SINGLE_COMPANY'): string {
    return type === 'MULTI_COMPANY' ? 'Multi-Empresa' : 'Empresa Individual';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'APPROVED': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'DENIED': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos para sincronizar con el tema del sidebar
  get backgroundThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-gradient-to-br from-slate-50 to-slate-100';
    } else {
      return 'bg-gradient-to-br from-slate-900 to-slate-800';
    }
  }

  get cardThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-white border border-slate-200';
    } else {
      return 'bg-white/10 backdrop-blur-md border border-slate-700';
    }
  }

  get textThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-900';
    } else {
      return 'text-white';
    }
  }

  get subTextThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-700';
    } else {
      return 'text-slate-400';
    }
  }

  get tableHeaderThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-slate-50 text-slate-700 border-slate-200';
    } else {
      return 'bg-slate-800/50 text-slate-300 border-slate-700';
    }
  }

  get tableRowThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'hover:bg-slate-50 border-slate-200';
    } else {
      return 'hover:bg-slate-700/50 border-slate-700';
    }
  }

  get modalThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-white border-slate-200';
    } else {
      return 'bg-slate-800 border-slate-700';
    }
  }

  get buttonThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    } else {
      return 'bg-blue-500 hover:bg-blue-600 text-white';
    }
  }

  get backButtonThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-slate-600 hover:text-slate-900';
    } else {
      return 'text-white/60 hover:text-white';
    }
  }

  get iconThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-slate-100 text-slate-600';
    } else {
      return 'bg-slate-700 text-slate-400';
    }
  }

  get labelThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'text-sm font-medium text-slate-700';
    } else {
      return 'text-sm font-medium text-slate-300';
    }
  }

  get inputThemeClasses(): string {
    const theme = this.themeService.currentTheme();
    if (theme === 'light') {
      return 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    } else {
      return 'bg-white/5 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    }
  }

  // Métodos para expandir/colapsar información detallada
  toggleRequestExpansion(requestEmail: string) {
    const currentExpanded = this.expandedRequests();
    const newExpanded = new Set(currentExpanded);
    
    if (newExpanded.has(requestEmail)) {
      newExpanded.delete(requestEmail);
    } else {
      newExpanded.add(requestEmail);
    }
    
    this.expandedRequests.set(newExpanded);
  }

  isRequestExpanded(requestEmail: string): boolean {
    return this.expandedRequests().has(requestEmail);
  }

  // Métodos de paginación
  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  goToPreviousPage() {
    const config = this.paginationConfig();
    if (config.hasPreviousPage) {
      this.currentPage.set(config.currentPage - 1);
    }
  }

  goToNextPage() {
    const config = this.paginationConfig();
    if (config.hasNextPage) {
      this.currentPage.set(config.currentPage + 1);
    }
  }

  goToFirstPage() {
    this.currentPage.set(1);
  }

  goToLastPage() {
    const config = this.paginationConfig();
    this.currentPage.set(config.totalPages);
  }

  pageNumbers = computed(() => {
    const config = this.paginationConfig();
    const totalPages = config.totalPages;
    const currentPage = config.currentPage;
    
    // Mostrar máximo 5 páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  });

  pageRange = computed(() => {
    const config = this.paginationConfig();
    const start = (config.currentPage - 1) * config.itemsPerPage + 1;
    const end = Math.min(config.currentPage * config.itemsPerPage, config.totalItems);
    return { start, end };
  });

  // Navegación
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
