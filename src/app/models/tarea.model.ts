// Describe los campos que la interfaz necesita para presentar una actividad académica.
export interface Tarea {
  // Identificador usado para seleccionar y relacionar la tarea.
  id: number;
  // Nombre del curso al que pertenece la actividad.
  curso: string;
  // Título descriptivo de la actividad o entregable.
  titulo: string;
  // Nombre de la persona instructora responsable.
  instructor: string;
  // Fecha límite que la interfaz presenta con formato local.
  fechaEntrega: string;
  // Estado de la actividad, por ejemplo pendiente o completado.
  estado: string;
}

// Define la información persistida para cada entrega local aún no sincronizada.
export interface EntregaPendiente {
  // Identificador único asignado al registro local.
  id: string;
  // Identificador de la tarea a la que pertenece la entrega.
  tareaId: number;
  // Comentario opcional enviado por el estudiante junto con la entrega.
  comentario: string;
  // Nombre visible del usuario que registró la entrega.
  usuario: string;
  // Fecha y hora en que el navegador guardó el registro.
  fechaRegistro: string;
  // Estado fijo que aclara que todavía no se ha enviado al Campus Virtual.
  estadoSincronizacion: 'PENDIENTE';
  // Archivos opcionales adjuntados a la entrega.
  archivos?: ArchivoEntrega[];
}

// Describe los metadatos y el contenido local de un archivo adjunto.
export interface ArchivoEntrega {
  // Nombre original del archivo seleccionado.
  nombre: string;
  // Tipo MIME del contenido, si el navegador lo pudo determinar.
  tipo: string;
  // Tamaño del archivo expresado en bytes.
  tamano: number;
  // Contenido binario que IndexedDB conserva como Blob.
  contenido: Blob;
}
