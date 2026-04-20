import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionService, SubscriptionAccess } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-subscription-blocked',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div class="max-w-lg w-full">
        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <!-- Top bar -->
          <div class="h-1.5 bg-linear-to-r from-red-500 via-amber-500 to-red-500"></div>

          <div class="p-8 text-center">
            <!-- Icon -->
            <div class="mx-auto w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-slate-900 mb-2">Acceso Suspendido</h1>

            <!-- Message -->
            <p class="text-slate-600 mb-6 leading-relaxed">
              {{ accessInfo()?.message || 'Su suscripción ha sido suspendida. Contacte al administrador para restablecer el acceso.' }}
            </p>

            <!-- Status badge -->
            @if (accessInfo()) {
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                   [class]="statusBadgeClass()">
                <span class="w-2 h-2 rounded-full" [class]="statusDotClass()"></span>
                {{ statusLabel() }}
              </div>
            }

            <!-- Actions -->
            <div class="space-y-3">
              <button
                (click)="retryAccess()"
                class="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                Reintentar
              </button>
              <button
                (click)="logout()"
                class="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors">
                Cerrar sesión
              </button>
            </div>

            <!-- Contact info -->
            <div class="mt-8 pt-6 border-t border-slate-100">
              <p class="text-xs text-slate-400">
                ¿Necesita ayuda? Contacte a soporte en
                <a href="mailto:soporte@nexum.com" class="text-blue-500 hover:underline">soporte&#64;nexum.com</a>
              </p>
            </div>
          </div>
        </div>

        <!-- Logo -->
        <div class="text-center mt-6">
          <span class="text-sm text-slate-400 font-medium">NEXUM TG</span>
        </div>
      </div>
    </div>
  `
})
export class SubscriptionBlockedComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  accessInfo = signal<SubscriptionAccess | null>(null);

  async ngOnInit() {
    const access = this.subscriptionService.currentAccess();
    if (access) {
      this.accessInfo.set(access);
    }
    // If somehow has access, redirect out
    if (access?.hasAccess) {
      this.router.navigate(['/dashboard']);
    }
  }

  async retryAccess() {
    const access = await this.subscriptionService.checkAccess();
    if (access.hasAccess) {
      this.router.navigate(['/dashboard']);
    } else {
      this.accessInfo.set(access);
    }
  }

  logout() {
    this.authService.logout();
  }

  statusBadgeClass(): string {
    const status = this.accessInfo()?.status;
    switch (status) {
      case 'suspended': return 'bg-red-50 text-red-700';
      case 'cancelled': return 'bg-slate-100 text-slate-700';
      case 'past_due': return 'bg-amber-50 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  statusDotClass(): string {
    const status = this.accessInfo()?.status;
    switch (status) {
      case 'suspended': return 'bg-red-500';
      case 'cancelled': return 'bg-slate-400';
      case 'past_due': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  }

  statusLabel(): string {
    const status = this.accessInfo()?.status;
    switch (status) {
      case 'suspended': return 'Suscripción suspendida';
      case 'cancelled': return 'Suscripción cancelada';
      case 'past_due': return 'Pago pendiente';
      case 'trial': return 'Período de prueba expirado';
      default: return 'Sin acceso';
    }
  }
}
