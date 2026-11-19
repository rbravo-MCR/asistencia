# Operación y preparación de producción

## Estado actual

La aplicación se verifica localmente con PostgreSQL real. El despliegue público requiere servidor/dominio, TLS, base y credenciales de producción, configuración de personal y copias externas. La compilación y las pruebas locales no certifican esos recursos.

## Variables externas y arranque

Mantener la configuración privada fuera del repositorio, por ejemplo `/etc/asistencia/runtime.env`, con propietario del servicio y permisos 0600. Crear el archivo real con las credenciales del destino; `.env.example` contiene únicamente referencias locales y no debe copiarse a producción sin reemplazar conexiones y claves.

Ejemplo de nombres requeridos (sin valores reales):

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=https://asistencia.example.com
APP_TIME_ZONE=America/Merida
DATABASE_URL=postgresql://USUARIO:CLAVE@SERVIDOR:5432/BASE
LOG_LEVEL=info
SESSION_HOURS=8
NOTIFICATION_WORKER_ENABLED=true
ATTENDANCE_WORKER_ENABLED=true
ATTENDANCE_EVALUATION_INTERVAL_SECONDS=60
```

Desde `apps/api`, con dependencias instaladas y contratos/API compilados, ejecutar directamente:

```sh
node --env-file=/etc/asistencia/runtime.env dist/main.js
```

El script `pnpm start` del paquete usa el archivo local de desarrollo; el comando directo anterior selecciona explícitamente el externo. El entorno heredado tiene precedencia sobre el archivo según Node: evitar conexiones antiguas exportadas al iniciar el servicio. El proceso rechaza `APP_ORIGIN` HTTP en producción; el navegador requiere HTTPS para cookies seguras y geolocalización. El proxy debe servir web compilada y `/api` bajo el mismo origen y reenviar a la API privada; preservar SPA fallback para rutas web y los estados reales de la API. Configurar certificados en el servidor elegido. API sin documentación interactiva en producción.

Aplicar migraciones con las variables del destino, usando el runner directo de migraciones compilado; realizar primero un respaldo verificable. El CLI local de recuperación exige acceso privado al servidor; no incluir códigos en logs, Git ni chats.

## Correos

Los avisos actuales son internos, persistentes y auditados; no hay transporte SMTP conectado. El archivo externo de correos aún no fue localizado ni proporcionado: falta confirmar si contiene direcciones por empleado o credenciales SMTP. No introducir direcciones ficticias ni claves en el repositorio. Las direcciones por empleado se aplicarán con servicios de usuarios y auditoría; la integración de entrega externa requiere proveedor/remitente/servidor, TLS, credenciales y destinatarios autorizados. Que un aviso interno figure entregado no prueba envío de correo.

## Respaldo y restauración local verificada

Los siguientes comandos operan exclusivamente sobre los contenedores locales definidos por `infra/compose.yaml`. No admiten URLs remotas ni restauran sobre la base real. El cliente PostgreSQL procede de los contenedores 18.6, evitando incompatibilidad con el servidor.

```sh
pnpm db:backup create /home/rafael/.local/state/asistencia/backups
pnpm db:backup verify /ruta/privada/ARCHIVO.dump
```

`create` conserva un dump custom y su manifiesto JSON SHA-256 en archivos 0600 dentro del directorio 0700. El dump y los recuentos de cada tabla pública comparten un snapshot exportado de solo lectura. Mantener ambos archivos juntos y privados: contienen datos de empleados, credenciales cifradas y evidencias privadas. El checksum detecta corrupción; no es cifrado ni firma contra un atacante con acceso de escritura a ambos archivos.

`verify` rechaza archivos corruptos, manifiestos inválidos, enlaces simbólicos en el archivo o permisos públicos. Crea una base de nombre generado `restore_UUID_test` exclusivamente en postgres-test; restaura allí, compara tablas/recuentos, comprueba restricciones validadas y elimina la base temporal. No usa `--clean` ni restaura sobre desarrollo/producción. Los trabajadores de la aplicación no se conectan a esa base temporal.

El respaldo local no cubre pérdida del equipo. Antes de producción se requiere almacenamiento externo cifrado, acceso mínimo, retención acordada y restauración periódica en entorno aislado del destino real. No se ha inventado ni contratado un proveedor externo.

## Validación de salida

Comprobar salud `/api/health/live` y `/api/health/ready`, ingreso real por HTTPS, cookies seguras, CSRF, permisos por rol, GPS presencial y home office sin GPS. Completar una prueba controlada marcaje → incidencia → justificación → decisión definitiva de jefatura y vacaciones → reserva → aprobación/cancelación; hacerlo en el entorno de aceptación, sin solicitudes o marcajes ficticios en los expedientes reales.

Antes de habilitar jornadas: confirmar vigencias y personal/centro. Tras migrar, cargar el preset oficial México 2026–2027 con el CLI de mantenimiento `holidays:sync` y un SUPER_ADMIN activo; para un entorno de producción usar el runner compilado `dist/bootstrap/sync-holidays.js` con el archivo externo real, igual que el arranque. Verificar las fuentes antes de ampliar años. La política configurable de corte administrativo está publicada en desarrollo a 30 minutos (08:30 para entrada 08:00): acepta el marcaje sujeto a validaciones y genera falta justificable; activar explícitamente esa configuración en el destino, sin reescribir controles anteriores. Antes de cargar vacaciones: obtener períodos y saldos respaldados por RR. HH.; la escala LFT publicada no reconstruye vacaciones ya utilizadas. La aplicación móvil se mantiene para el final.
