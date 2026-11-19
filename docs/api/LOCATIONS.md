# Centros y validación de ubicación (etapa 12)

`GET /api/locations` y `GET /api/location-authorizations` devuelven `{items}` con alcance por empleado propio/departamentos gestionados, o global para `viewAllEmployees`. No devuelven coordenadas personales ni historial GPS.

ADMIN/HR con sesión y CSRF pueden crear/editar centros (`POST /api/locations`, `PUT /api/locations/:id`), eliminar centros sin referencias (`DELETE`), autorizar empleados administrativos activos (`POST /api/location-authorizations`) y revocar (`DELETE /api/location-authorizations/:id`). La revocación es idempotente y conserva el historial; un centro con referencias se desactiva mediante `PUT` con `active:false`.

Centro: `{name,latitude,longitude,radiusMeters,maxAccuracyMeters,active}`. Autorización: `{employeeId,locationId,startsOn,endsOn}`; fechas civiles de Mérida, ambos extremos inclusivos, `endsOn:null` sin fecha final. Centros activos y autorizaciones efectivas son necesarios para validar presencial.

`POST /api/locations/validate` requiere sesión y CSRF. Recibe `{employeeId?,latitude?,longitude?,accuracy?}`. Omite `employeeId` para usar al empleado vinculado; seleccionar otro empleado exige alcance vigente. El servidor toma la hora y la fecha en `America/Merida`, nunca el reloj cliente. Responde `{id,employeeId,result,checkedAt,distanceMeters,locationId}`. No registra entrada, salida ni asistencia.

Resultados persistidos: `VALID`, `OUTSIDE_GEOFENCE`, `ACCURACY_INSUFFICIENT`, `LOCATION_REQUIRED`, `NO_AUTHORIZED_LOCATION`, `NOT_REQUIRED`. La distancia Haversine debe ser menor o igual al radio y, de forma independiente, la precisión reportada debe ser menor o igual a la máxima. Basta cualquier centro activo autorizado que cumpla ambas. Cada comprobación conserva el snapshot de las políticas evaluadas. El personal operativo recibe `NOT_REQUIRED`, sin conservar sus coordenadas aunque lleguen en el cuerpo. Los intentos presenciales conservan datos de revisión; no hay monitoreo continuo ni lectura pública de coordenadas personales.

La migración 0006 crea una vez el centro real (21.0364532482013, -89.62273424224803), radio inicial 10 m y precisión máxima inicial configurable 10 m. Repetir las migraciones o reiniciar la API no restablece configuraciones editadas. El helper `initializeLocationDefaults(tx)` queda disponible para inicializaciones explícitas e idempotentes, sin sobrescribir el centro existente. No crea empleados, cuentas ni autorizaciones de demostración.
