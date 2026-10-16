// Importa directivas y pipes comunes usados por la plantilla, como *ngIf y date.
import { CommonModule } from '@angular/common';
// Importa las herramientas para enlazar los campos de formularios con el componente.
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
// Importa los tipos de datos que se muestran y guardan desde la interfaz.
import { ArchivoEntrega, EntregaPendiente, Tarea } from './models/tarea.model';
// Importa los servicios de almacenamiento local y consulta del catálogo académico.
import { StorageService } from './services/storage.service';
import { TareaService } from './services/tarea.service';

// Configura la vista raíz y sus dependencias visuales.
@Component({
  // Nombre de la etiqueta HTML que representa este componente.
  selector: 'app-root',
  // Declara el componente autónomo, sin necesidad de un NgModule.
  standalone: true,
  // Habilita directivas comunes y formularios en la plantilla.
  imports: [CommonModule, FormsModule],
  // Archivo HTML que describe el contenido visual del componente.
  templateUrl: './app.component.html',
  // Archivo SCSS con estilos específicos del componente.
  styleUrl: './app.component.scss'
})
// Controla el acceso, catálogo, estado de conexión y registro local de entregas.
export class AppComponent implements OnInit {
  // Nombre de la aplicación usado también en la etiqueta accesible de marca.
  readonly title = 'SENATI TaskHub';
  // Correo que escribe el usuario en el formulario de acceso.
  correo = '';
  // Contraseña temporal usada únicamente para validar campos no vacíos en la demo.
  contrasena = '';
  // Nombre derivado del correo para personalizar el saludo.
  usuario = '';
  // Indica si se debe mostrar el catálogo y formulario o la pantalla de acceso.
  autenticado = false;
  // Mensaje de error visible en el formulario de inicio de sesión.
  errorInicioSesion = '';
  // Estado de conectividad actual del navegador.
  online = globalThis.navigator.onLine;
  // Tareas recuperadas del catálogo remoto local o de la caché de IndexedDB.
  tareas: Tarea[] = [];
  // Entregas guardadas en el dispositivo y mostradas en la bandeja.
  entregasGuardadas: EntregaPendiente[] = [];
  // Identificador de la tarea elegida para registrar una entrega.
  tareaSeleccionadaId: number | null = null;
  // Texto que el usuario agrega como comentario a su entrega.
  comentarioEntrega = '';
  // Archivos seleccionados que todavía no se han guardado en IndexedDB.
  archivosSeleccionados: File[] = [];
  // Mensajes de resultado que se presentan en la interfaz.
  mensajeNotificacion = '';
  // Controla la indicación de carga del catálogo.
  cargandoTareas = true;
  // Evita solicitudes repetidas mientras se guarda una entrega.
  guardandoEntrega = false;

  // Obtiene el servicio que consulta el archivo de tareas.
  private readonly tareaService = inject(TareaService);
  // Obtiene el servicio que persiste datos localmente en IndexedDB.
  private readonly storageService = inject(StorageService);
  // Clave de localStorage que contiene la sesión demostrativa del navegador.
  private readonly claveSesion = 'senatiTaskHub.demoUser';

  // Calcula cuántas tareas del catálogo tienen estado pendiente.
  get tareasPendientes(): number {
    return this.tareas.filter((tarea) => tarea.estado.toLowerCase() === 'pendiente').length;
  }

  // Restaura la sesión, carga el catálogo y recupera las entregas guardadas al iniciar.
  ngOnInit(): void {
    // Lee el correo de la sesión anterior; usa una cadena vacía si aún no hay sesión.
    const correoGuardado = globalThis.localStorage.getItem(this.claveSesion) ?? '';
    // Convierte la parte inicial del correo en un nombre legible.
    this.usuario = this.nombreDesdeCorreo(correoGuardado);
    // Considera iniciada la sesión solo si pudo derivar un nombre del correo almacenado.
    this.autenticado = this.usuario.length > 0;
    // Solicita el catálogo y define acciones distintas para éxito y error.
    this.tareaService.obtenerTareas().subscribe({
      // Procesa las tareas recibidas y conserva una copia offline.
      next: (tareas) => {
        // Actualiza los datos que utiliza la plantilla para mostrar la lista.
        this.tareas = tareas;
        // Selecciona inicialmente la primera tarea, si existe.
        this.tareaSeleccionadaId = tareas[0]?.id ?? null;
        // Oculta el indicador de carga al recibir el catálogo.
        this.cargandoTareas = false;
        // Actualiza el respaldo local sin bloquear la presentación del catálogo.
        void this.storageService.guardarTareasCache(tareas).catch((error: unknown) => {
          // Registra el error técnico y muestra una notificación comprensible.
          console.error('No se pudo actualizar la copia local del catálogo.', error);
          this.mensajeNotificacion = 'El catálogo está disponible, pero no se pudo actualizar su copia offline.';
        });
      },
      // Intenta recuperar la copia offline cuando falla la consulta del catálogo.
      error: (error: unknown) => {
        // Registra el error de consulta antes de activar la recuperación local.
        console.error('Error al recuperar el catálogo de tareas.', error);
        void this.cargarCatalogoLocal();
      }
    });
    // Recupera la bandeja de entregas guardadas previamente.
    void this.cargarEntregasGuardadas();
  }

  // Valida los campos y guarda una sesión demostrativa en el navegador.
  iniciarSesion(): void {
    // Elimina espacios accidentales al principio y al final del correo.
    const correo = this.correo.trim();
    // Exige que ambos campos tengan contenido, sin autenticar contra un servidor.
    if (!correo || !this.contrasena) {
      this.errorInicioSesion = 'Ingresa tu correo y una contraseña para continuar.';
      return;
    }

    try {
      // Persiste el correo para restaurar la sesión al volver a abrir la aplicación.
      globalThis.localStorage.setItem(this.claveSesion, correo);
      // Actualiza el nombre y cambia la interfaz al área de tareas.
      this.usuario = this.nombreDesdeCorreo(correo);
      this.autenticado = true;
      // Limpia el error anterior y borra la contraseña del estado del componente.
      this.errorInicioSesion = '';
      this.contrasena = '';
    } catch (error: unknown) {
      // Informa si el navegador no permite guardar la sesión local.
      console.error('No se pudo guardar la sesión local.', error);
      this.errorInicioSesion = 'No se pudo guardar la sesión en este dispositivo.';
    }
  }

  // Elimina la sesión demostrativa y restablece los campos del formulario.
  cerrarSesion(): void {
    try {
      // Retira el correo guardado en localStorage.
      globalThis.localStorage.removeItem(this.claveSesion);
      // Restablece los datos de sesión y de acceso.
      this.usuario = '';
      this.autenticado = false;
      this.correo = '';
      this.contrasena = '';
      this.errorInicioSesion = '';
    } catch (error: unknown) {
      // Informa si el navegador no permitió eliminar la sesión.
      console.error('No se pudo cerrar la sesión local.', error);
      this.errorInicioSesion = 'No se pudo cerrar la sesión en este dispositivo.';
    }
  }

  // Transforma la parte del correo anterior a @ en un nombre legible.
  private nombreDesdeCorreo(correo: string): string {
    // Sustituye separadores por espacios y normaliza el texto en español.
    const nombre = correo.split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim()
      .toLocaleLowerCase('es');
    // Convierte a mayúscula la inicial de cada palabra.
    return nombre.replace(/(^|\s)\p{L}/gu, (letra) => letra.toLocaleUpperCase('es'));
  }

  // Actualiza el estado visual de conexión cuando el navegador recupera internet.
  @HostListener('window:online')
  actualizarEstadoOnline(): void {
    this.online = true;
  }

  // Actualiza el estado visual de conexión cuando el navegador queda offline.
  @HostListener('window:offline')
  actualizarEstadoOffline(): void {
    this.online = false;
  }

  // Cambia la tarea activa y descarta avisos anteriores del formulario.
  seleccionarTarea(tareaId: number): void {
    this.tareaSeleccionadaId = tareaId;
    this.mensajeNotificacion = '';
  }

  // Copia los archivos elegidos por el usuario y reinicia el input para permitir repetir selección.
  seleccionarArchivos(event: Event): void {
    // Obtiene el control HTML de tipo archivo que generó el evento.
    const input = event.target as HTMLInputElement;
    // Copia la selección en el estado del componente para mostrarla y guardarla.
    this.archivosSeleccionados = Array.from(input.files ?? []);
    // Vacía el control sin borrar la copia mantenida en archivosSeleccionados.
    input.value = '';
  }

  // Quita de la lista local el archivo correspondiente al índice indicado.
  quitarArchivo(indice: number): void {
    this.archivosSeleccionados = this.archivosSeleccionados.filter((_, index) => index !== indice);
  }

  // Busca una tarea y crea el texto de curso y título que se muestra en la bandeja.
  obtenerNombreTarea(tareaId: number): string {
    const tarea = this.tareas.find((item) => item.id === tareaId);
    return tarea ? `${tarea.curso} — ${tarea.titulo}` : `Tarea #${tareaId}`;
  }

  // Valida y persiste el comentario y/o los archivos de la tarea seleccionada.
  async enviarEntrega(): Promise<void> {
    // Quita espacios para determinar si el comentario tiene contenido real.
    const comentario = this.comentarioEntrega.trim();
    // No guarda si ya se está procesando, no hay contenido o falta una tarea seleccionada.
    if (this.guardandoEntrega || (!comentario && this.archivosSeleccionados.length === 0) || this.tareaSeleccionadaId === null) {
      return;
    }

    // Deshabilita el botón para evitar guardados duplicados.
    this.guardandoEntrega = true;
    // Adapta los objetos File al formato tipado de archivos de entrega.
    const archivos: ArchivoEntrega[] = this.archivosSeleccionados.map((archivo) => ({
      nombre: archivo.name,
      tipo: archivo.type,
      tamano: archivo.size,
      contenido: archivo
    }));
    // Reúne los datos que se guardarán; IndexedDB completa ID, fecha y estado.
    const entrega: Omit<EntregaPendiente, 'id' | 'fechaRegistro' | 'estadoSincronizacion'> = {
      tareaId: this.tareaSeleccionadaId,
      comentario,
      usuario: this.usuario,
      archivos
    };

    try {
      // Guarda la entrega en el dispositivo y actualiza la bandeja visible.
      await this.storageService.guardarEntregaLocal(entrega);
      await this.cargarEntregasGuardadas();
      // Aclara que la entrega está guardada localmente, no enviada al Campus Virtual.
      this.mensajeNotificacion = this.online
        ? 'Entrega y archivos guardados en este dispositivo. Quedan pendientes de sincronización con el Campus Virtual.'
        : 'Sin conexión: entrega y archivos guardados en este dispositivo con estado PENDIENTE.';
      // Limpia el formulario después de completar el guardado.
      this.comentarioEntrega = '';
      this.archivosSeleccionados = [];
    } catch (error: unknown) {
      // Registra y presenta el motivo del fallo de almacenamiento.
      console.error('No se pudo guardar la entrega local.', error);
      this.mensajeNotificacion = error instanceof Error
        ? `No se pudo guardar la entrega: ${error.message}`
        : 'No se pudo guardar la entrega en este dispositivo.';
    } finally {
      // Reactiva el botón tanto si el guardado se completó como si falló.
      this.guardandoEntrega = false;
    }
  }

  // Recupera el catálogo desde IndexedDB si la carga principal no estuvo disponible.
  private async cargarCatalogoLocal(): Promise<void> {
    try {
      // Lee el catálogo que se guardó durante una sesión con conexión.
      this.tareas = await this.storageService.obtenerTareasCache();
      // Selecciona la primera tarea disponible para facilitar el registro.
      this.tareaSeleccionadaId = this.tareas[0]?.id ?? null;
      // Muestra si se cargó una copia offline o si aún no existe una.
      this.mensajeNotificacion = this.tareas.length > 0
        ? 'Sin conexión: se muestra el catálogo guardado en este dispositivo.'
        : 'No hay catálogo guardado. Conéctate una vez para preparar el acceso offline.';
    } catch (error: unknown) {
      // Informa fallos ocurridos al consultar la copia local del catálogo.
      console.error('No se pudo recuperar el catálogo local.', error);
      this.mensajeNotificacion = 'No se pudo cargar el catálogo de tareas ni su copia local.';
    } finally {
      // Finaliza el estado de carga aunque la recuperación local falle.
      this.cargandoTareas = false;
    }
  }

  // Recupera desde IndexedDB las entregas pendientes para mostrarlas en la pantalla.
  private async cargarEntregasGuardadas(): Promise<void> {
    try {
      this.entregasGuardadas = await this.storageService.obtenerEntregasPendientes();
    } catch (error: unknown) {
      // Informa fallos al consultar la bandeja local de entregas.
      console.error('No se pudieron recuperar las entregas guardadas.', error);
      this.mensajeNotificacion = 'No se pudieron recuperar las entregas guardadas en este dispositivo.';
    }
  }
}
