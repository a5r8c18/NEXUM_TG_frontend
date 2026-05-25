import { Injectable, inject, signal, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutos antes

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: (() => void)[] = [];

  showWarning = signal(false);
  remainingSeconds = signal(0);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  private readonly ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

  initialize(): void {
    if (!this.authService.isAuthenticated()) return;

    this.ngZone.runOutsideAngular(() => {
      this.ACTIVITY_EVENTS.forEach(event => {
        const handler = () => this.resetTimer();
        document.addEventListener(event, handler, { passive: true });
        this.listeners.push(() => document.removeEventListener(event, handler));
      });
    });

    this.resetTimer();
  }

  private resetTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.showWarning.set(false);

    // Mostrar advertencia 5 minutos antes del logout
    this.warningTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.showWarning.set(true);
        this.remainingSeconds.set(Math.floor(WARNING_BEFORE_MS / 1000));
        this.countdownInterval = setInterval(() => {
          const current = this.remainingSeconds();
          if (current <= 0) {
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          } else {
            this.remainingSeconds.set(current - 1);
          }
        }, 1000);
      });
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Logout automático por inactividad
    this.idleTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.performLogout();
      });
    }, IDLE_TIMEOUT_MS);
  }

  private performLogout(): void {
    this.cleanup();
    this.authService.logout();
    this.router.navigate(['/auth/login'], {
      queryParams: { reason: 'idle_timeout' },
    });
  }

  extendSession(): void {
    this.resetTimer();
  }

  private cleanup(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
    this.showWarning.set(false);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
