import { Injectable, OnDestroy, signal, computed, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface WsNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private authService = inject(AuthService);

  notifications = signal<WsNotification[]>([]);
  connected = signal(false);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  connect(): void {
    if (this.socket?.connected) return;

    const wsUrl = environment.apiUrl;
    this.socket = io(`${wsUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      this.registerUser();
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
    });

    this.socket.on('notification', (data: Omit<WsNotification, 'read'>) => {
      const notification: WsNotification = { ...data, read: false };
      this.notifications.update(list => [notification, ...list]);
    });

    this.socket.on('tenant-request-update', (data: { action: string; email: string; status: string }) => {
      const notification: WsNotification = {
        id: crypto.randomUUID(),
        title: data.action === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada',
        message: `Solicitud de ${data.email}: ${data.status}`,
        type: data.action === 'approved' ? 'success' : 'warning',
        timestamp: new Date().toISOString(),
        read: false,
      };
      this.notifications.update(list => [notification, ...list]);
    });

    this.socket.on('stock-alert', (data: { productName: string; currentStock: number; minStock: number }) => {
      const notification: WsNotification = {
        id: crypto.randomUUID(),
        title: 'Alerta de stock bajo',
        message: `${data.productName}: ${data.currentStock} unidades (mín: ${data.minStock})`,
        type: 'warning',
        timestamp: new Date().toISOString(),
        read: false,
      };
      this.notifications.update(list => [notification, ...list]);
    });

    this.socket.on('invoice-update', (data: { invoiceId: string; status: string }) => {
      const notification: WsNotification = {
        id: crypto.randomUUID(),
        title: 'Factura actualizada',
        message: `Factura ${data.invoiceId} cambió a estado: ${data.status}`,
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
      };
      this.notifications.update(list => [notification, ...list]);
    });
  }

  private registerUser(): void {
    const user = this.authService.currentUser();
    if (user && this.socket) {
      this.socket.emit('register', {
        userId: user.id,
        role: user.role,
        tenantId: user.tenantId,
      });
    }
  }

  markAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  deleteNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  clearAll(): void {
    this.notifications.set([]);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected.set(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
