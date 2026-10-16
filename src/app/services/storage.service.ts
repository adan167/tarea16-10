import { Injectable } from '@angular/core';
import { EntregaPendiente, Tarea } from '../models/tarea.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly databaseName = 'senatiTaskHub';
  private readonly databaseVersion = 2;
  private readonly storeName = 'entregas_pendientes';
  private readonly tasksStoreName = 'catalogo_tareas';

  async guardarEntregaLocal(
    entrega: Omit<EntregaPendiente, 'id' | 'fechaRegistro' | 'estadoSincronizacion'>
  ): Promise<void> {
    const database = await this.abrirBaseDeDatos();
    const transaction = database.transaction(this.storeName, 'readwrite');
    const record: EntregaPendiente = {
      ...entrega,
      id: globalThis.crypto.randomUUID(),
      fechaRegistro: new Date().toISOString(),
      estadoSincronizacion: 'PENDIENTE'
    };

    return new Promise<void>((resolve, reject) => {
      transaction.objectStore(this.storeName).add(record);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('No se pudo guardar la entrega en IndexedDB.'));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error('La transacción de IndexedDB fue cancelada.'));
      };
    });
  }

  async obtenerEntregasPendientes(): Promise<EntregaPendiente[]> {
    const database = await this.abrirBaseDeDatos();
    const transaction = database.transaction(this.storeName, 'readonly');
    const request = transaction.objectStore(this.storeName).getAll();

    return new Promise<EntregaPendiente[]>((resolve, reject) => {
      transaction.oncomplete = () => {
        database.close();
        resolve(request.result.sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro)));
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('No se pudieron recuperar las entregas locales.'));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error('La lectura de entregas locales fue cancelada.'));
      };
    });
  }

  async guardarTareasCache(tareas: Tarea[]): Promise<void> {
    const database = await this.abrirBaseDeDatos();
    const transaction = database.transaction(this.tasksStoreName, 'readwrite');
    transaction.objectStore(this.tasksStoreName).put({ id: 'catalogo', tareas });

    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('No se pudo guardar el catálogo local.'));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error('El almacenamiento del catálogo fue cancelado.'));
      };
    });
  }

  async obtenerTareasCache(): Promise<Tarea[]> {
    const database = await this.abrirBaseDeDatos();
    const transaction = database.transaction(this.tasksStoreName, 'readonly');
    const request = transaction.objectStore(this.tasksStoreName).get('catalogo');

    return new Promise<Tarea[]>((resolve, reject) => {
      transaction.oncomplete = () => {
        database.close();
        resolve((request.result as { tareas: Tarea[] } | undefined)?.tareas ?? []);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('No se pudo recuperar el catálogo local.'));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error('La lectura del catálogo local fue cancelada.'));
      };
    });
  }

  private abrirBaseDeDatos(): Promise<IDBDatabase> {
    if (!globalThis.indexedDB) {
      return Promise.reject(new Error('Este navegador no permite almacenamiento IndexedDB.'));
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.databaseName, this.databaseVersion);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(this.tasksStoreName)) {
          database.createObjectStore(this.tasksStoreName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        reject(request.error ?? new Error('No se pudo abrir la base de datos local.'));
      };
      request.onblocked = () => {
        reject(new Error('La actualización de la base de datos local está bloqueada.'));
      };
    });
  }
}
