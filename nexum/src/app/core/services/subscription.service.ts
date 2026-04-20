import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface SubscriptionAccess {
  hasAccess: boolean;
  status: string;
  plan: string;
  daysRemaining: number;
  isGracePeriod: boolean;
  message: string;
}

export interface SubscriptionInfo {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  priceUsd: number;
  maxUsers: number;
  maxCompanies: number;
  gracePeriodDays: number;
  lastPaymentDate: string | null;
  nextPaymentDate: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanConfig {
  maxUsers: number;
  maxCompanies: number;
  priceUsd: number;
  trialDays: number;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/subscriptions`;

  currentAccess = signal<SubscriptionAccess | null>(null);
  isBlocked = signal(false);
  blockMessage = signal('');

  async checkAccess(): Promise<SubscriptionAccess> {
    try {
      const access = await firstValueFrom(
        this.http.get<SubscriptionAccess>(`${this.apiUrl}/check`)
      );
      this.currentAccess.set(access);
      this.isBlocked.set(!access.hasAccess);
      this.blockMessage.set(access.hasAccess ? '' : access.message);
      return access;
    } catch {
      // If request fails (offline, etc.), allow access
      const fallback: SubscriptionAccess = {
        hasAccess: true,
        status: 'unknown',
        plan: 'unknown',
        daysRemaining: 0,
        isGracePeriod: false,
        message: 'No se pudo verificar la suscripción.',
      };
      this.currentAccess.set(fallback);
      this.isBlocked.set(false);
      return fallback;
    }
  }

  async getPlans(): Promise<Record<string, PlanConfig>> {
    return firstValueFrom(
      this.http.get<Record<string, PlanConfig>>(`${this.apiUrl}/plans`)
    );
  }

  async getAllSubscriptions(): Promise<SubscriptionInfo[]> {
    return firstValueFrom(
      this.http.get<SubscriptionInfo[]>(this.apiUrl)
    );
  }

  async getByTenant(tenantId: string): Promise<SubscriptionInfo | null> {
    return firstValueFrom(
      this.http.get<SubscriptionInfo | null>(`${this.apiUrl}/tenant/${tenantId}`)
    );
  }

  async activatePlan(tenantId: string, plan: string): Promise<SubscriptionInfo> {
    return firstValueFrom(
      this.http.post<SubscriptionInfo>(`${this.apiUrl}/activate`, { tenantId, plan })
    );
  }

  async registerPayment(tenantId: string): Promise<SubscriptionInfo> {
    return firstValueFrom(
      this.http.post<SubscriptionInfo>(`${this.apiUrl}/payment`, { tenantId })
    );
  }

  async suspend(tenantId: string, reason: string): Promise<SubscriptionInfo> {
    return firstValueFrom(
      this.http.put<SubscriptionInfo>(`${this.apiUrl}/suspend/${tenantId}`, { reason })
    );
  }

  async cancel(tenantId: string): Promise<SubscriptionInfo> {
    return firstValueFrom(
      this.http.put<SubscriptionInfo>(`${this.apiUrl}/cancel/${tenantId}`, {})
    );
  }

  async createTrial(tenantId: string): Promise<SubscriptionInfo> {
    return firstValueFrom(
      this.http.post<SubscriptionInfo>(`${this.apiUrl}/trial`, { tenantId })
    );
  }

  async getExpiring(days: number = 3): Promise<SubscriptionInfo[]> {
    return firstValueFrom(
      this.http.get<SubscriptionInfo[]>(`${this.apiUrl}/expiring?days=${days}`)
    );
  }
}
