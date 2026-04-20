import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './footer/footer.component';
import { SidebarService } from '../core/services/sidebar.service';
import { AuthService } from '../core/services/auth.service';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { NetworkStatusComponent } from '../shared/components/network-status/network-status.component';
import { SyncStatusComponent } from '../shared/components/sync-status/sync-status.component';
import { ThemeService } from '../core/services/theme.service';
import { OfflineSyncManagerService } from '../core/offline/offline-sync-manager.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent, FooterComponent, RouterOutlet, ConfirmDialogComponent, NetworkStatusComponent, SyncStatusComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private syncManager = inject(OfflineSyncManagerService);
  private themeService = inject(ThemeService);
  
  sidebarCollapsed = this.sidebarService.isCollapsed;
  
  shouldShowSidebar = computed(() => true);

  ngOnInit(): void {
    this.syncManager.initialize();
  }
}
