import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from './shared/sidebar.service';
import { AuthService } from './shared/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html'
})
export class App {
  protected readonly title = signal('nexum');
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  
  sidebarCollapsed = this.sidebarService.isCollapsed;
  isAuthenticated = this.authService.isAuthenticated;
}
