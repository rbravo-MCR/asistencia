# Primera entrega: puntos 4–7

## Alcance autorizado

Completar API y pantalla de creación/listado de Departamentos, verificar el flujo React → Fastify → caso de uso → PostgreSQL → React y actualizar documentación. Reutilizar entidad, contratos y migración existentes. No implementar edición/eliminación, autenticación, empleados ni otros módulos.

## API y aplicación

- `GET /api/departments`: 200 con `{ items: DepartmentResponse[] }`.
- `POST /api/departments`: JSON `{ name }`, 201 con el departamento confirmado.
- 400: forma inválida o nombre inválido tras normalizar. No convertir números a strings ni eliminar silenciosamente campos adicionales.
- 409: nombre duplicado, incluso bajo concurrencia.
- 500: fallo interno o de persistencia, sin SQL, conexión ni secretos en la respuesta.
- Mantener envelope de errores con código, mensaje y requestId, documentación OpenAPI y `Cache-Control: no-store`.

Casos de uso explícitos bajo `application/`, dependientes de la interfaz de repositorio. Adaptador HTTP privado y función de registro pública del módulo. El bootstrap compone repositorio, casos de uso y rutas; no introduce reglas de negocio. Las fechas se serializan a ISO UTC con milisegundos.

## Web

Ruta `/departamentos` accesible desde la navegación común. Vista responsiva con lista y formulario de nombre. React Hook Form y Zod normalizan NFC/trim y validan el límite por puntos de código, sin un maxLength HTML que rechace texto NFD válido. Reutilizar componentes shadcn/ui.

TanStack Query obtiene el listado real y lo actualiza después de una creación confirmada. No reintentar automáticamente POST. Deshabilitar envío durante la creación, conservar datos al fallar y señalar duplicado en el campo. Mostrar estados de carga, vacío, error recuperable, guardando y éxito accesibles. No mostrar IDs técnicos ni mensajes internos al usuario.

## Verificación y entrega

Pruebas de API con PostgreSQL real en una base temporal propia; casos de validación estricta, normalización, duplicados, concurrencia y OpenAPI. Pruebas UI de carga, vacío, fallo/reintento, validación, envío pendiente y confirmación. E2E de escritorio/móvil crea, recarga y comprueba PostgreSQL directamente; limpia exclusivamente sus filas en `_test`.

No se cambian las migraciones aplicadas. Verificar lint, formato, tipos, suites, build, dependencias y arranque compilado. Actualizar README, guía de desarrollo, contratos HTTP y evidencia. El resultado sigue siendo una entrega local sin autenticación; no equivale a habilitación productiva.
