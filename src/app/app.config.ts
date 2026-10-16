// Importa la configuración base y permite reconocer si la app está en modo desarrollo.
import { ApplicationConfig, isDevMode } from '@angular/core';
// Proveedor del sistema de rutas de Angular.
import { provideRouter } from '@angular/router';
// Proveedor de solicitudes HTTP utilizado por el servicio de tareas.
import { provideHttpClient } from '@angular/common/http';

// Rutas disponibles en la aplicación.
import { routes } from './app.routes';
// Proveedor del Service Worker para caché y soporte offline en producción.
import { provideServiceWorker } from '@angular/service-worker';

// Registra los proveedores globales requeridos para iniciar la aplicación.
export const appConfig: ApplicationConfig = {
  // Configura navegación, solicitudes HTTP y el Service Worker de Angular.
  providers: [provideRouter(routes), provideHttpClient(), provideServiceWorker('ngsw-worker.js', {
        // Desactiva el worker en desarrollo y lo habilita en compilaciones de producción.
        enabled: !isDevMode(),
        // Registra el worker en cuanto la aplicación inicia.
        registrationStrategy: 'registerImmediately'
    })]
};
