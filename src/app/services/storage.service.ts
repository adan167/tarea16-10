// Importa el decorador que permite registrar este servicio en el sistema de dependencias de Angular.
import { Injectable } from '@angular/core';
// Importa los tipos que describen las tareas y las entregas pendientes almacenadas.
import { EntregaPendiente, Tarea } from '../models/tarea.model';

// Declara que Angular puede inyectar este servicio en toda la aplicación.
@Injectable({
  // Crea una única instancia compartida del servicio desde el inyector raíz.
  providedIn: 'root'
})
// Centraliza las operaciones de persistencia local de tareas y entregas.
export class StorageService {
  // Nombre con el que IndexedDB identifica la base de datos de la aplicación.
  private readonly databaseName = 'senatiTaskHub';
  // Versión del esquema usada para detectar y aplicar cambios en la base de datos.
  private readonly databaseVersion = 2;
  // Nombre del almacén que contiene las entregas aún no sincronizadas.
  private readonly storeName = 'entregas_pendientes';
  // Nombre del almacén donde se conserva una copia local del catálogo de tareas.
  private readonly tasksStoreName = 'catalogo_tareas';

  // Guarda una entrega de forma asíncrona y resuelve cuando IndexedDB confirma la escritura.
  async guardarEntregaLocal(
    // Recibe los datos de la entrega; el identificador, la fecha y el estado se generan aquí.
    entrega: Omit<EntregaPendiente, 'id' | 'fechaRegistro' | 'estadoSincronizacion'>
  // Indica que la operación no devuelve un valor aparte de su finalización.
  ): Promise<void> {
    // Abre la base local antes de iniciar la transacción de escritura.
    const database = await this.abrirBaseDeDatos();
    // Crea una transacción de lectura y escritura sobre el almacén de entregas.
    const transaction = database.transaction(this.storeName, 'readwrite');
    // Completa el registro con un ID único, fecha actual y estado inicial pendiente.
    const record: EntregaPendiente = {
      // Copia comentario, usuario, tarea y archivos recibidos como datos de la entrega.
      ...entrega,
      // Genera un identificador único para distinguir este registro.
      id: globalThis.crypto.randomUUID(),
      // Registra la fecha y hora actual en formato ISO.
      fechaRegistro: new Date().toISOString(),
      // Marca la entrega como pendiente porque no se envía a ningún servidor.
      estadoSincronizacion: 'PENDIENTE'
    };

    // Adapta los eventos de IndexedDB a una promesa para que quien llama pueda esperar el resultado.
    return new Promise<void>((resolve, reject) => {
      // Añade el registro al almacén de entregas pendientes.
      transaction.objectStore(this.storeName).add(record);
      // Atiende la confirmación exitosa de la transacción completa.
      transaction.oncomplete = () => {
        // Cierra la conexión para liberar recursos del navegador.
        database.close();
        // Informa que la entrega quedó guardada correctamente.
        resolve();
      };
      // Atiende los errores producidos durante la escritura.
      transaction.onerror = () => {
        // Cierra la conexión incluso cuando la operación falla.
        database.close();
        // Rechaza la promesa con el error real o con un mensaje explicativo alternativo.
        reject(transaction.error ?? new Error('No se pudo guardar la entrega en IndexedDB.'));
      };
      // Atiende la cancelación o interrupción de la transacción.
      transaction.onabort = () => {
        // Cierra la conexión si la operación se cancela.
        database.close();
        // Rechaza la promesa con el error de IndexedDB o un mensaje de cancelación.
        reject(transaction.error ?? new Error('La transacción de IndexedDB fue cancelada.'));
      };
    });
  }

  // Recupera todas las entregas guardadas localmente y las devuelve de la más reciente a la más antigua.
  async obtenerEntregasPendientes(): Promise<EntregaPendiente[]> {
    // Abre la base de datos local.
    const database = await this.abrirBaseDeDatos();
    // Inicia una transacción de solo lectura sobre el almacén de entregas.
    const transaction = database.transaction(this.storeName, 'readonly');
    // Solicita todos los registros disponibles en el almacén.
    const request = transaction.objectStore(this.storeName).getAll();

    // Convierte los eventos de lectura de IndexedDB en una promesa.
    return new Promise<EntregaPendiente[]>((resolve, reject) => {
      // Espera a que termine la transacción antes de entregar los resultados.
      transaction.oncomplete = () => {
        // Cierra la base de datos tras completar la lectura.
        database.close();
        // Ordena los registros por fecha descendente y devuelve el arreglo resultante.
        resolve(request.result.sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro)));
      };
      // Atiende errores ocurridos al leer las entregas.
      transaction.onerror = () => {
        // Libera la conexión aunque la lectura falle.
        database.close();
        // Rechaza con el error de la transacción o un mensaje descriptivo.
        reject(transaction.error ?? new Error('No se pudieron recuperar las entregas locales.'));
      };
      // Atiende la cancelación de la lectura.
      transaction.onabort = () => {
        // Cierra la conexión cancelada.
        database.close();
        // Rechaza la promesa para informar que la lectura no pudo completarse.
        reject(transaction.error ?? new Error('La lectura de entregas locales fue cancelada.'));
      };
    });
  }

  // Guarda o reemplaza la copia local completa del catálogo de tareas.
  async guardarTareasCache(tareas: Tarea[]): Promise<void> {
    // Abre la base de datos que contiene el almacenamiento offline.
    const database = await this.abrirBaseDeDatos();
    // Abre una transacción de escritura en el almacén del catálogo.
    const transaction = database.transaction(this.tasksStoreName, 'readwrite');
    // Guarda el arreglo bajo la clave fija "catalogo"; put reemplaza el valor previo si existe.
    transaction.objectStore(this.tasksStoreName).put({ id: 'catalogo', tareas });

    // Permite esperar a que IndexedDB confirme o rechace el guardado.
    return new Promise<void>((resolve, reject) => {
      // Atiende la confirmación de la escritura.
      transaction.oncomplete = () => {
        // Cierra la conexión al finalizar correctamente.
        database.close();
        // Resuelve la promesa indicando que el catálogo quedó guardado.
        resolve();
      };
      // Atiende errores de escritura del catálogo.
      transaction.onerror = () => {
        // Cierra la conexión tras el error.
        database.close();
        // Rechaza con el error de IndexedDB o un mensaje entendible.
        reject(transaction.error ?? new Error('No se pudo guardar el catálogo local.'));
      };
      // Atiende una cancelación de la transacción.
      transaction.onabort = () => {
        // Cierra la conexión cuando se cancela la escritura.
        database.close();
        // Rechaza la promesa para que el llamador pueda informar el fallo.
        reject(transaction.error ?? new Error('El almacenamiento del catálogo fue cancelado.'));
      };
    });
  }

  // Lee y devuelve el catálogo que se había guardado para su uso sin conexión.
  async obtenerTareasCache(): Promise<Tarea[]> {
    // Abre la base de datos local.
    const database = await this.abrirBaseDeDatos();
    // Inicia una transacción de solo lectura sobre el almacén de tareas.
    const transaction = database.transaction(this.tasksStoreName, 'readonly');
    // Solicita el registro identificado con la clave fija "catalogo".
    const request = transaction.objectStore(this.tasksStoreName).get('catalogo');

    // Devuelve una promesa que se completa cuando finaliza la lectura.
    return new Promise<Tarea[]>((resolve, reject) => {
      // Espera a que la transacción concluya correctamente.
      transaction.oncomplete = () => {
        // Cierra la base de datos después de leer el registro.
        database.close();
        // Extrae el arreglo de tareas; si aún no existe catálogo, devuelve un arreglo vacío.
        resolve((request.result as { tareas: Tarea[] } | undefined)?.tareas ?? []);
      };
      // Atiende los errores ocurridos al leer el catálogo.
      transaction.onerror = () => {
        // Libera la conexión si la lectura falla.
        database.close();
        // Rechaza la promesa con el error real o un mensaje descriptivo.
        reject(transaction.error ?? new Error('No se pudo recuperar el catálogo local.'));
      };
      // Atiende la cancelación de la transacción de lectura.
      transaction.onabort = () => {
        // Cierra la conexión luego de la cancelación.
        database.close();
        // Informa al llamador que la lectura no terminó.
        reject(transaction.error ?? new Error('La lectura del catálogo local fue cancelada.'));
      };
    });
  }

  // Abre la base de datos y crea los almacenes necesarios cuando se instala o actualiza el esquema.
  private abrirBaseDeDatos(): Promise<IDBDatabase> {
    // Comprueba que el navegador permita utilizar IndexedDB.
    if (!globalThis.indexedDB) {
      // Devuelve un error explícito si el almacenamiento no está disponible.
      return Promise.reject(new Error('Este navegador no permite almacenamiento IndexedDB.'));
    }

    // Envuelve la apertura de IndexedDB en una promesa para integrarla con async/await.
    return new Promise<IDBDatabase>((resolve, reject) => {
      // Solicita abrir la base de datos con el nombre y la versión definidos en el servicio.
      const request = globalThis.indexedDB.open(this.databaseName, this.databaseVersion);

      // Se ejecuta cuando IndexedDB necesita crear o actualizar la estructura de la base.
      request.onupgradeneeded = () => {
        // Obtiene la base de datos asociada a esta solicitud de apertura.
        const database = request.result;
        // Crea el almacén de entregas solo si todavía no existe.
        if (!database.objectStoreNames.contains(this.storeName)) {
          // Usa la propiedad "id" de cada entrega como clave primaria.
          database.createObjectStore(this.storeName, { keyPath: 'id' });
        }
        // Crea el almacén del catálogo solo si todavía no existe.
        if (!database.objectStoreNames.contains(this.tasksStoreName)) {
          // Usa la propiedad "id" del registro de catálogo como clave primaria.
          database.createObjectStore(this.tasksStoreName, { keyPath: 'id' });
        }
      };
      // Resuelve la promesa con la conexión una vez abierta correctamente.
      request.onsuccess = () => resolve(request.result);
      // Atiende errores al abrir la base de datos.
      request.onerror = () => {
        // Rechaza con el error generado o con un mensaje de apertura fallida.
        reject(request.error ?? new Error('No se pudo abrir la base de datos local.'));
      };
      // Atiende el caso en que otras conexiones impidan completar la actualización.
      request.onblocked = () => {
        // Rechaza la operación e indica que la actualización está bloqueada.
        reject(new Error('La actualización de la base de datos local está bloqueada.'));
      };
    });
  }
}
