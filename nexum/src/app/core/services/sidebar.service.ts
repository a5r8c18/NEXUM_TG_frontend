import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isCollapsedSignal = signal(false);
  
  // Exponer el signal como readonly
  isCollapsed = this.isCollapsedSignal.asReadonly();
  
  toggleSidebar(): void {
    this.isCollapsedSignal.set(!this.isCollapsedSignal());
  }
  
  setCollapsed(collapsed: boolean): void {
    this.isCollapsedSignal.set(collapsed);
  }
}
