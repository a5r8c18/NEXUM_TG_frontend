import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './footer/footer.component';
import { SidebarService } from '../core/services/sidebar.service';
import { AuthService } from '../core/services/auth.service';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent, FooterComponent, RouterOutlet, ConfirmDialogComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  
  sidebarCollapsed = this.sidebarService.isCollapsed;
  
  shouldShowSidebar = computed(() => true);
}
