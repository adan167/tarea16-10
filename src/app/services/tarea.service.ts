// Importa HttpClient para solicitar el archivo local con los datos del catálogo.
import { HttpClient } from '@angular/common/http';
// Importa utilidades para registrar el servicio e inyectar sus dependencias.
import { Injectable, inject } from '@angular/core';
// Observable representa la respuesta asíncrona de la solicitud HTTP.
import { Observable } from 'rxjs';
// Tipo de cada elemento que devuelve el catálogo.
import { Tarea } from '../models/tarea.model';

// Permite que Angular comparta este servicio en toda la aplicación.
@Injectable({
  providedIn: 'root'
})
// Encapsula la lectura del catálogo de tareas utilizado por la interfaz.
export class TareaService {
  // Obtiene el cliente HTTP configurado por Angular.
  private readonly http = inject(HttpClient);
  // Ruta del archivo JSON que contiene el catálogo de ejemplo.
  private readonly tareasUrl = '/assets/data/tareas.json';

  // Solicita las tareas y expone los resultados como Observable tipado.
  obtenerTareas(): Observable<Tarea[]> {
    return this.http.get<Tarea[]>(this.tareasUrl);
  }
}
