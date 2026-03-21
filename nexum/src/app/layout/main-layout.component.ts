import { Component, inject } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './components/header.component';
import { FooterComponent } from './footer/footer.component';
import { SidebarService } from '../core/services/sidebar.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent {
  private sidebarService = inject(SidebarService);
  
  sidebarCollapsed = this.sidebarService.isCollapsed;
}
