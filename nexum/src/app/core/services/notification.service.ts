import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { InventoryItem } from '../../models/inventory.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  private toasts: { message: string; type: 'success' | 'error' | 'info' }[] = [];
  toasts$ = new Subject<{ message: string; type: 'success' | 'error' | 'info' }>();

  showSuccess(message: string): void {
    this.toasts$.next({ message, type: 'success' });
  }

  showError(message: string): void {
    this.toasts$.next({ message, type: 'error' });
  }

  showInfo(message: string): void {
    this.toasts$.next({ message, type: 'info' });
  }

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  checkNotifications(inventory: InventoryItem[]): void {
    const lowStock = inventory.filter(
      (item) => item.stockLimit != null && item.stock <= item.stockLimit
    );
    if (lowStock.length > 0) {
      this.showError(`⚠️ ${lowStock.length} producto(s) con stock bajo`);
    }
  }

  refreshNotifications(inventory: InventoryItem[]): void {
    this.checkNotifications(inventory);
  }
}
