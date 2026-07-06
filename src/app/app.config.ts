import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Habilita las llamadas HTTP al backend (CatalogoService las usa).
    // El authInterceptor adjunta el token JWT a cada peticion cuando
    // hay sesion iniciada (asi las rutas protegidas funcionan solas).
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
