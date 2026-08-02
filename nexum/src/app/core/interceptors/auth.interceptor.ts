import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints de autenticación que no deben intentar renovar el token. */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/logout'];

function isAuthEndpoint(url: string): boolean {
  return AUTH_ENDPOINTS.some((path) => url.includes(path));
}

/**
 * Renueva el access token y reintenta la petición cuando el backend responde 401.
 * Si la renovación falla se cierra la sesión, evitando que la app quede
 * "autenticada" disparando peticiones con un token expirado (datos vacíos).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const withToken = (request: HttpRequest<unknown>, token: string) =>
    request.clone({ headers: request.headers.set('Authorization', `Bearer ${token}`) });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint(req.url) || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      return from(authService.refreshSession()).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            authService.logout();
            return throwError(() => error);
          }
          return next(withToken(req, newToken));
        }),
      );
    }),
  );
};
