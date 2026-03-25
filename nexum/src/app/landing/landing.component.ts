import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  private router = inject(Router);

  currentYear = new Date().getFullYear();

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToSignup() {
    this.router.navigate(['/tenant-request']);
  }

  startDemo() {
    // Para demo: saltar autenticación y ir directo a selección de tenant
    this.router.navigate(['/tenant-selection']);
  }
}
