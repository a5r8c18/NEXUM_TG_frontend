import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal(false);
  private currentUserSignal = signal<any>(null);
  private isDevMode = signal(false); // Flag para desarrollo

  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  currentUser = this.currentUserSignal.asReadonly();

  constructor(private router: Router) {
    // Verificar si hay una sesión activa al iniciar
    this.checkAuthStatus();
    
    // Activar modo desarrollo si está en localhost
    this.isDevMode.set(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }

  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      // En modo desarrollo, permitir cualquier credencial
      if (this.isDevMode()) {
        setTimeout(() => {
          this.currentUserSignal.set({
            email: email,
            name: 'Developer User',
            role: 'administrator'
          });
          this.isAuthenticatedSignal.set(true);
          
          // Guardar en localStorage
          localStorage.setItem('authToken', 'dev-jwt-token');
          localStorage.setItem('currentUser', JSON.stringify({
            email: email,
            name: 'Developer User',
            role: 'administrator'
          }));
          
          resolve(true);
        }, 500); // Más rápido en desarrollo
      } else {
        // Lógica normal de autenticación
        setTimeout(() => {
          if (email && password) {
            this.currentUserSignal.set({
              email: email,
              name: 'Admin User',
              role: 'administrator'
            });
            this.isAuthenticatedSignal.set(true);
            
            localStorage.setItem('authToken', 'simulated-jwt-token');
            localStorage.setItem('currentUser', JSON.stringify({
              email: email,
              name: 'Admin User',
              role: 'administrator'
            }));
            
            resolve(true);
          } else {
            resolve(false);
          }
        }, 1000);
      }
    });
  }

  // Método para desarrollo: saltar autenticación
  skipAuth(): void {
    if (this.isDevMode()) {
      this.currentUserSignal.set({
        email: 'dev@nexum.com',
        name: 'Developer',
        role: 'administrator'
      });
      this.isAuthenticatedSignal.set(true);
      
      localStorage.setItem('authToken', 'dev-jwt-token');
      localStorage.setItem('currentUser', JSON.stringify({
        email: 'dev@nexum.com',
        name: 'Developer',
        role: 'administrator'
      }));
    }
  }

  signup(userData: { firstName: string; lastName: string; email: string; password: string }): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulación de registro
      setTimeout(() => {
        if (userData.email && userData.password) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1000);
    });
  }

  logout(): void {
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    
    // Limpiar localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Redirigir al login
    this.router.navigate(['/login']);
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
      this.currentUserSignal.set(JSON.parse(user));
      this.isAuthenticatedSignal.set(true);
    } else if (this.isDevMode()) {
      // En modo desarrollo, si no hay sesión, crear una automáticamente
      this.skipAuth();
    }
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }

  // Método para verificar si está en modo desarrollo
  isDevelopment(): boolean {
    return this.isDevMode();
  }
}
