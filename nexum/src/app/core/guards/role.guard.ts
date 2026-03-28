import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const currentUser = this.authService.currentUser();
    
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Para el guard de facturador, verificamos si el usuario tiene rol de facturador o admin
    if (currentUser.role === 'facturador' || currentUser.role === 'admin') {
      return true;
    }

    // Si no tiene el rol adecuado, redirigir al dashboard
    this.router.navigate(['/dashboard']);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminOnlyGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const currentUser = this.authService.currentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
