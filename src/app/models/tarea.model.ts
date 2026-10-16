export interface Tarea {
  id: number;
  curso: string;
  titulo: string;
  instructor: string;
  fechaEntrega: string;
  estado: string;
}

export interface EntregaPendiente {
  id: string;
  tareaId: number;
  comentario: string;
  usuario: string;
  fechaRegistro: string;
  estadoSincronizacion: 'PENDIENTE';
  archivos?: ArchivoEntrega[];
}

export interface ArchivoEntrega {
  nombre: string;
  tipo: string;
  tamano: number;
  contenido: Blob;
}
