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
      this.router.navigate(['/login']);
      return false;
    }

    // Superadmin, admin y facturador tienen acceso a facturación
    if (currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.role === 'facturador') {
      return true;
    }

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
    
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SuperadminOnlyGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const currentUser = this.authService.currentUser();
    
    if (!currentUser || currentUser.role !== 'superadmin') {
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
