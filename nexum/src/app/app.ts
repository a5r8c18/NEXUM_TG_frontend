import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from './core/services/sidebar.service';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html'
})
export class App {
  protected readonly title = signal('nexum');
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);

  sidebarCollapsed = this.sidebarService.isCollapsed;
  isAuthenticated = this.authService.isAuthenticated;
}
