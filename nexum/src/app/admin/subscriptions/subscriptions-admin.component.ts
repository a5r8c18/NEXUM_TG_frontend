import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubscriptionService, SubscriptionInfo, PlanConfig } from '../../core/services/subscription.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-subscriptions-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions-admin.component.html',
})
export class SubscriptionsAdminComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);

  subscriptions = signal<SubscriptionInfo[]>([]);
  plans = signal<Record<string, PlanConfig>>({});
  isLoading = signal(false);
  hasError = signal(false);
  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filtros
  statusFilter = signal('ALL');
  planFilter = signal('ALL');
  searchTerm = signal('');

  // Modales
  showActivateModal = signal(false);
  showSuspendModal = signal(false);
  selectedSub = signal<SubscriptionInfo | null>(null);
  selectedPlan = signal('basic');
  suspendReason = signal('');

  // Computed
  filteredSubscriptions = computed(() => {
    let list = this.subscriptions();
    const status = this.statusFilter();
    const plan = this.planFilter();
    const search = this.searchTerm().toLowerCase();

    if (status !== 'ALL') list = list.filter(s => s.status === status);
    if (plan !== 'ALL') list = list.filter(s => s.plan === plan);
    if (search) list = list.filter(s => s.tenantId.toLowerCase().includes(search));

    return list;
  });

  activeCount = computed(() => this.subscriptions().filter(s => s.status === 'active').length);
  trialCount = computed(() => this.subscriptions().filter(s => s.status === 'trial').length);
  suspendedCount = computed(() => this.subscriptions().filter(s => s.status === 'suspended').length);
  pastDueCount = computed(() => this.subscriptions().filter(s => s.status === 'past_due').length);

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);
    try {
      const [subs, plans] = await Promise.all([
        this.subscriptionService.getAllSubscriptions(),
        this.subscriptionService.getPlans(),
      ]);
      this.subscriptions.set(subs);
      this.plans.set(plans);
    } catch {
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Acciones ──────────────────────────────────────────────

  openActivateModal(sub: SubscriptionInfo): void {
    this.selectedSub.set(sub);
    this.selectedPlan.set(sub.plan === 'trial' ? 'basic' : sub.plan);
    this.showActivateModal.set(true);
  }

  async confirmActivate(): Promise<void> {
    const sub = this.selectedSub();
    if (!sub) return;
    try {
      await this.subscriptionService.activatePlan(sub.tenantId, this.selectedPlan());
      this.showToast(`Plan ${this.selectedPlan()} activado para ${sub.tenantId}`, 'success');
      this.closeModals();
      await this.loadData();
    } catch {
      this.showToast('Error al activar plan', 'error');
    }
  }

  async registerPayment(sub: SubscriptionInfo): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Registrar Pago',
      message: `¿Registrar pago para el tenant ${sub.tenantId}?\nPlan: ${this.getPlanLabel(sub.plan)} — $${sub.priceUsd}/mes`,
      confirmText: 'Registrar Pago',
      type: 'success',
    });
    if (!confirmed) return;
    try {
      await this.subscriptionService.registerPayment(sub.tenantId);
      this.showToast('Pago registrado exitosamente', 'success');
      await this.loadData();
    } catch {
      this.showToast('Error al registrar pago', 'error');
    }
  }

  openSuspendModal(sub: SubscriptionInfo): void {
    this.selectedSub.set(sub);
    this.suspendReason.set('');
    this.showSuspendModal.set(true);
  }

  async confirmSuspend(): Promise<void> {
    const sub = this.selectedSub();
    if (!sub || !this.suspendReason()) return;
    try {
      await this.subscriptionService.suspend(sub.tenantId, this.suspendReason());
      this.showToast(`Suscripción suspendida: ${sub.tenantId}`, 'success');
      this.closeModals();
      await this.loadData();
    } catch {
      this.showToast('Error al suspender', 'error');
    }
  }

  async cancelSubscription(sub: SubscriptionInfo): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cancelar Suscripción',
      message: `¿Cancelar permanentemente la suscripción de ${sub.tenantId}?\nEsta acción no se puede deshacer fácilmente.`,
      confirmText: 'Cancelar Suscripción',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await this.subscriptionService.cancel(sub.tenantId);
      this.showToast('Suscripción cancelada', 'success');
      await this.loadData();
    } catch {
      this.showToast('Error al cancelar', 'error');
    }
  }

  async createTrial(sub: SubscriptionInfo): Promise<void> {
    try {
      await this.subscriptionService.createTrial(sub.tenantId);
      this.showToast('Trial creado exitosamente', 'success');
      await this.loadData();
    } catch {
      this.showToast('Error al crear trial', 'error');
    }
  }

  closeModals(): void {
    this.showActivateModal.set(false);
    this.showSuspendModal.set(false);
    this.selectedSub.set(null);
    this.suspendReason.set('');
  }

  // ── Utilidades ────────────────────────────────────────────

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'trial': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'past_due': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'suspended': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'cancelled': return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Activa',
      trial: 'Trial',
      past_due: 'Pago Pendiente',
      suspended: 'Suspendida',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }

  getPlanLabel(plan: string): string {
    const labels: Record<string, string> = {
      trial: 'Trial',
      basic: 'Básico',
      professional: 'Profesional',
      enterprise: 'Empresarial',
    };
    return labels[plan] || plan;
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  formatDateTime(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
