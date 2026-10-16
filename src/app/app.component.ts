import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArchivoEntrega, EntregaPendiente, Tarea } from './models/tarea.model';
import { StorageService } from './services/storage.service';
import { TareaService } from './services/tarea.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  readonly title = 'SENATI TaskHub';
  correo = '';
  contrasena = '';
  usuario = '';
  autenticado = false;
  errorInicioSesion = '';
  online = globalThis.navigator.onLine;
  tareas: Tarea[] = [];
  entregasGuardadas: EntregaPendiente[] = [];
  tareaSeleccionadaId: number | null = null;
  comentarioEntrega = '';
  archivosSeleccionados: File[] = [];
  mensajeNotificacion = '';
  cargandoTareas = true;
  guardandoEntrega = false;

  private readonly tareaService = inject(TareaService);
  private readonly storageService = inject(StorageService);
  private readonly claveSesion = 'senatiTaskHub.demoUser';

  get tareasPendientes(): number {
    return this.tareas.filter((tarea) => tarea.estado.toLowerCase() === 'pendiente').length;
  }

  ngOnInit(): void {
    const correoGuardado = globalThis.localStorage.getItem(this.claveSesion) ?? '';
    this.usuario = this.nombreDesdeCorreo(correoGuardado);
    this.autenticado = this.usuario.length > 0;
    this.tareaService.obtenerTareas().subscribe({
      next: (tareas) => {
        this.tareas = tareas;
        this.tareaSeleccionadaId = tareas[0]?.id ?? null;
        this.cargandoTareas = false;
        void this.storageService.guardarTareasCache(tareas).catch((error: unknown) => {
          console.error('No se pudo actualizar la copia local del catálogo.', error);
          this.mensajeNotificacion = 'El catálogo está disponible, pero no se pudo actualizar su copia offline.';
        });
      },
      error: (error: unknown) => {
        console.error('Error al recuperar el catálogo de tareas.', error);
        void this.cargarCatalogoLocal();
      }
    });
    void this.cargarEntregasGuardadas();
  }

  iniciarSesion(): void {
    const correo = this.correo.trim();
    if (!correo || !this.contrasena) {
      this.errorInicioSesion = 'Ingresa tu correo y una contraseña para continuar.';
      return;
    }

    try {
      globalThis.localStorage.setItem(this.claveSesion, correo);
      this.usuario = this.nombreDesdeCorreo(correo);
      this.autenticado = true;
      this.errorInicioSesion = '';
      this.contrasena = '';
    } catch (error: unknown) {
      console.error('No se pudo guardar la sesión local.', error);
      this.errorInicioSesion = 'No se pudo guardar la sesión en este dispositivo.';
    }
  }

  cerrarSesion(): void {
    try {
      globalThis.localStorage.removeItem(this.claveSesion);
      this.usuario = '';
      this.autenticado = false;
      this.correo = '';
      this.contrasena = '';
      this.errorInicioSesion = '';
    } catch (error: unknown) {
      console.error('No se pudo cerrar la sesión local.', error);
      this.errorInicioSesion = 'No se pudo cerrar la sesión en este dispositivo.';
    }
  }

  private nombreDesdeCorreo(correo: string): string {
    const nombre = correo.split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim()
      .toLocaleLowerCase('es');
    return nombre.replace(/(^|\s)\p{L}/gu, (letra) => letra.toLocaleUpperCase('es'));
  }

  @HostListener('window:online')
  actualizarEstadoOnline(): void {
    this.online = true;
  }

  @HostListener('window:offline')
  actualizarEstadoOffline(): void {
    this.online = false;
  }

  seleccionarTarea(tareaId: number): void {
    this.tareaSeleccionadaId = tareaId;
    this.mensajeNotificacion = '';
  }

  seleccionarArchivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivosSeleccionados = Array.from(input.files ?? []);
    input.value = '';
  }

  quitarArchivo(indice: number): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter((_, index) => index !== indice);
  }

  obtenerNombreTarea(tareaId: number): string {
    const tarea = this.tareas.find((item) => item.id === tareaId);
    return tarea ? `${tarea.curso} — ${tarea.titulo}` : `Tarea #${tareaId}`;
  }

  async enviarEntrega(): Promise<void> {
    const comentario = this.comentarioEntrega.trim();
    if (this.guardandoEntrega || (!comentario && this.archivosSeleccionados.length === 0) || this.tareaSeleccionadaId === null) {
      return;
    }

    this.guardandoEntrega = true;
    const archivos: ArchivoEntrega[] = this.archivosSeleccionados.map((archivo) => ({
      nombre: archivo.name,
      tipo: archivo.type,
      tamano: archivo.size,
      contenido: archivo
    }));
    const entrega: Omit<EntregaPendiente, 'id' | 'fechaRegistro' | 'estadoSincronizacion'> = {
      tareaId: this.tareaSeleccionadaId,
      comentario,
      usuario: this.usuario,
      archivos
    };

    try {
      await this.storageService.guardarEntregaLocal(entrega);
      await this.cargarEntregasGuardadas();
      this.mensajeNotificacion = this.online
        ? 'Entrega y archivos guardados en este dispositivo. Quedan pendientes de sincronización con el Campus Virtual.'
        : 'Sin conexión: entrega y archivos guardados en este dispositivo con estado PENDIENTE.';
      this.comentarioEntrega = '';
      this.archivosSeleccionados = [];
    } catch (error: unknown) {
      console.error('No se pudo guardar la entrega local.', error);
      this.mensajeNotificacion = error instanceof Error
        ? `No se pudo guardar la entrega: ${error.message}`
        : 'No se pudo guardar la entrega en este dispositivo.';
    } finally {
      this.guardandoEntrega = false;
    }
  }

  private async cargarCatalogoLocal(): Promise<void> {
    try {
      this.tareas = await this.storageService.obtenerTareasCache();
      this.tareaSeleccionadaId = this.tareas[0]?.id ?? null;
      this.mensajeNotificacion = this.tareas.length > 0
        ? 'Sin conexión: se muestra el catálogo guardado en este dispositivo.'
        : 'No hay catálogo guardado. Conéctate una vez para preparar el acceso offline.';
    } catch (error: unknown) {
      console.error('No se pudo recuperar el catálogo local.', error);
      this.mensajeNotificacion = 'No se pudo cargar el catálogo de tareas ni su copia local.';
    } finally {
      this.cargandoTareas = false;
    }
  }

  private async cargarEntregasGuardadas(): Promise<void> {
    try {
      this.entregasGuardadas = await this.storageService.obtenerEntregasPendientes();
    } catch (error: unknown) {
      console.error('No se pudieron recuperar las entregas guardadas.', error);
      this.mensajeNotificacion = 'No se pudieron recuperar las entregas guardadas en este dispositivo.';
    }
  }
}
