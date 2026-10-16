// Importa la función que inicia una aplicación Angular autónoma en el navegador.
import { bootstrapApplication } from '@angular/platform-browser';
// Configuración global con proveedores HTTP, rutas y Service Worker.
import { appConfig } from './app/app.config';
// Componente raíz que contiene la interfaz de SENATI TaskHub.
import { AppComponent } from './app/app.component';

// Inicia la aplicación con su componente raíz y configuración compartida.
bootstrapApplication(AppComponent, appConfig)
  // Registra en consola cualquier error ocurrido durante el arranque.
  .catch((err) => console.error(err));
