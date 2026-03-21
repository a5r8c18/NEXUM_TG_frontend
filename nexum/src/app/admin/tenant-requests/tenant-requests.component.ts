import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TenantRequestService } from '../../core/services/tenant-request.service';
import { TenantRequest, TenantType } from '../../core/models/tenant-request.model';

@Component({
  selector: 'app-tenant-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-requests.component.html'
})
export class TenantRequestsComponent {
  private tenantRequestService = inject(TenantRequestService);
  private router = inject(Router);

  requests = signal<TenantRequest[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  selectedRequest = signal<TenantRequest | null>(null);
  showApprovalModal = signal(false);
  showRejectionModal = signal(false);
  rejectionReason = signal('');
  adminNotes = signal('');

  // Filtros
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';
  typeFilter: 'ALL' | 'MULTI_COMPANY' | 'SINGLE_COMPANY' = 'ALL';

  constructor() {
    this.loadRequests();
  }

  async loadRequests() {
    this.isLoading.set(true);
    this.hasError.set(false);

    try {
      const data = await firstValueFrom(this.tenantRequestService.getRequests()) as TenantRequest[];
      this.requests.set(data);
    } catch (error) {
      this.hasError.set(true);
      console.error('Error loading requests:', error instanceof Error ? error.message : String(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  get filteredRequests(): TenantRequest[] {
    return this.requests().filter(request => {
      const statusMatch = this.statusFilter === 'ALL' || request.status === this.statusFilter;
      const typeMatch = this.typeFilter === 'ALL' || request.tenantType === this.typeFilter;
      return statusMatch && typeMatch;
    });
  }

  get pendingCount(): number {
    return this.requests().filter(r => r.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.requests().filter(r => r.status === 'APPROVED').length;
  }

  get rejectedCount(): number {
    return this.requests().filter(r => r.status === 'REJECTED').length;
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

  async approveRequest() {
    const selectedReq = this.selectedRequest();
    if (!selectedReq) return;

    try {
      await this.tenantRequestService.approveRequest(
        selectedReq.email,
        this.adminNotes() || undefined
      );
      
      // Actualizar la solicitud localmente
      const updated = this.requests().map(r => 
        r.email === selectedReq.email 
          ? { ...r, status: 'APPROVED' as const, reviewedAt: new Date(), adminNotes: this.adminNotes() }
          : r
      );
      this.requests.set(updated);
      
      this.closeModals();
    } catch (error: unknown) {
      console.error('Error approving request:', error instanceof Error ? error.message : String(error));
    }
  }

  async rejectRequest() {
    const selectedReq = this.selectedRequest();
    if (!selectedReq || !this.rejectionReason()) return;

    try {
      await this.tenantRequestService.rejectRequest(
        selectedReq.email,
        this.rejectionReason(),
        this.adminNotes() || undefined
      );
      
      // Actualizar la solicitud localmente
      const updated = this.requests().map(r => 
        r.email === selectedReq.email 
          ? { 
              ...r, 
              status: 'REJECTED' as const, 
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
      case 'REJECTED': return 'text-red-400 bg-red-400/10 border-red-400/30';
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

  // Navegación
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
