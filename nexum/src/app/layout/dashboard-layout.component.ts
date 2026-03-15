import { Component, inject } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './layout_components/header.component';
import { FooterComponent } from './footer/footer.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { SidebarService } from '../shared/sidebar.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, FooterComponent, DashboardComponent],
  templateUrl: './dashboard-layout.component.html'
})
export class DashboardLayoutComponent {
  private sidebarService = inject(SidebarService);
  
  sidebarCollapsed = this.sidebarService.isCollapsed;
}
