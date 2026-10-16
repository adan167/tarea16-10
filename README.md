# SENATI TaskHub

Aplicación web progresiva para consultar tareas académicas y registrar avances, incluso sin conexión.

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:8080/`. `npm start` compila y sirve los archivos de producción en el puerto 8080 para instalar correctamente el Service Worker. Para desarrollo con recarga rápida, usa `npm run start:dev`; en este modo el Service Worker se desactiva. Si el puerto 8080 está ocupado, en PowerShell usa `$env:PORT=8081; npm start` y abre `http://localhost:8081/`. El catálogo de ejemplo está en `public/assets/data/tareas.json`.

## Funciones

- Manifiesto PWA con identidad visual de SENATI.
- Caché del catálogo, archivos estáticos y shell de la aplicación mediante Angular Service Worker.
- Catálogo local de respaldo y almacenamiento persistente de entregas, comentarios y archivos en IndexedDB.
- Bandeja de entregas guardadas con estado `PENDIENTE` e indicador de conectividad.
- Inicio de sesión local de demostración, con sesión persistente en el navegador.
- Diseño adaptable para escritorio y dispositivos móviles.

El inicio de sesión es solo demostrativo: acepta cualquier correo y contraseña no vacíos, no autentica contra SENATI y no debe usarse como protección de datos reales. La sesión local permite volver a abrir la aplicación offline en el mismo navegador.

Para probar el modo offline, inicia con `npm start`, abre la aplicación una vez con conexión, ingresa y espera a que se instale el Service Worker. Después, desconéctate y recarga la misma dirección y puerto. Se conserva el catálogo de tareas y es posible registrar comentarios y adjuntar archivos; las entregas se almacenan localmente en IndexedDB.

El proyecto no incluye una API del Campus Virtual ni una ruta de sincronización. Por eso, las entregas quedan guardadas con estado `PENDIENTE` y no se informa que fueron enviadas a un servidor.

## Verificación

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```
