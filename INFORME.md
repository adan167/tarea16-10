# Informe de trabajo: SENATI TaskHub

## 1. Objetivo

SENATI TaskHub es una aplicación web progresiva (PWA) destinada a consultar tareas académicas y registrar avances o archivos desde el navegador, incluso cuando el dispositivo no tiene conexión.

## 2. Trabajo implementado

- **Catálogo de tareas:** la aplicación obtiene las tareas desde `public/assets/data/tareas.json` y presenta curso, actividad, instructor, fecha de entrega y estado. Incluye un catálogo de ejemplo con dos actividades.
- **Acceso de demostración:** permite iniciar y cerrar una sesión local usando correo y contraseña no vacíos. El correo se conserva en el almacenamiento del navegador y se utiliza para mostrar el nombre del usuario.
- **Registro de entregas:** permite seleccionar una tarea, escribir un comentario de hasta 1000 caracteres y adjuntar uno o varios archivos. El comentario y/o los archivos se guardan en el dispositivo.
- **Persistencia local:** usa IndexedDB para conservar las entregas pendientes y una copia del catálogo. Las entregas quedan marcadas como `PENDIENTE` y se muestran en la bandeja de entregas guardadas.
- **Funcionamiento offline:** incorpora Angular Service Worker para almacenar en caché la aplicación, sus recursos y el catálogo. Si no se puede recuperar el catálogo, intenta mostrar la copia guardada localmente.
- **Estado de conexión:** informa si el navegador está conectado o sin conexión y actualiza el indicador cuando cambia la conectividad.
- **Interfaz adaptable:** presenta pantallas de acceso, catálogo y registro de entregas, con elementos y estilos orientados a escritorio y dispositivos móviles.
- **Instalación como PWA:** incluye manifiesto, colores de tema e iconos para que la aplicación pueda instalarse en dispositivos compatibles.

## 3. Tecnologías y estructura

El proyecto utiliza Angular 17, TypeScript, RxJS, SCSS, Angular Service Worker e IndexedDB. La aplicación está organizada en un componente principal, un modelo de tareas y entregas, y servicios separados para consultar el catálogo y administrar el almacenamiento local.

## 4. Alcance y limitaciones

El inicio de sesión es exclusivamente demostrativo: no valida credenciales con SENATI ni debe considerarse un mecanismo de seguridad. La sesión solo se conserva en el navegador donde se inició.

El proyecto no incluye conexión con la API del Campus Virtual ni un proceso de sincronización. Por lo tanto, guardar una entrega no significa que haya sido enviada al instructor o al servidor; permanece localmente con estado `PENDIENTE`.

## 5. Ejecución y verificación

Para instalar dependencias e iniciar la versión de producción local:

```bash
npm install
npm start
```

La aplicación se sirve en `http://localhost:8080/`. Para desarrollo con recarga rápida se puede usar `npm run start:dev`.

El proyecto define pruebas unitarias para la creación del componente, la presentación del catálogo, el inicio de sesión local y el guardado de entregas con comentarios o archivos. También dispone de los comandos `npm test -- --watch=false --browsers=ChromeHeadless` y `npm run build`. Estos comandos no se ejecutaron durante la elaboración de este informe, por lo que no se afirma que las pruebas o la compilación hayan sido verificadas en esta sesión.

## 6. Resultado

Se cuenta con una PWA funcional como demostración de consulta de tareas y registro local de avances, con persistencia en el dispositivo y soporte para escenarios sin conexión. La integración con sistemas institucionales y el envío remoto de entregas quedan fuera del alcance actual.
