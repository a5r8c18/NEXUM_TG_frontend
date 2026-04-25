import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { contextInterceptor } from './core/interceptors/context.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { GlobalErrorHandler } from './core/error-handler/global-error-handler.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([contextInterceptor, errorInterceptor])
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};
