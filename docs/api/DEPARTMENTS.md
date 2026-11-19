# API de Departamentos

CRUD de departamentos. Requiere sesión. ADMIN/HR pueden crear, editar y eliminar; lectura filtrada por departamento, salvo acceso global autorizado. Ver `IDENTITY_EMPLOYEES.md` para login, cookie y CSRF.

Base local: `http://127.0.0.1:3001`. La web utiliza el proxy del mismo origen `/api`.

## Consultar

`GET /api/departments` → **200**

```json
{
  "items": [
    {
      "id": "5ff93c1e-33a0-4f04-b5d1-503f339d0c61",
      "name": "Administración",
      "createdAt": "2026-11-12T15:00:00.000Z"
    }
  ]
}
```

Ejemplo de formato, no datos precargados. Una colección vacía devuelve `{ "items": [] }`. Orden del servidor: nombre e identificador, según la collation de PostgreSQL.

```bash
curl --fail-with-body -H 'Cookie: asistencia_session=<sesión>' http://127.0.0.1:3001/api/departments
```

## Crear

`POST /api/departments`, `Content-Type: application/json` → **201**

```json
{ "name": "Administración" }
```

Devuelve el departamento confirmado con `id`, `name` y `createdAt`, en el formato del elemento anterior. El nombre se normaliza a NFC y se eliminan espacios externos. Debe quedar entre 1 y 100 puntos de código Unicode y no contener U+0000. Los duplicados se detectan sin distinguir mayúsculas/minúsculas; acentos y espacios internos se conservan.

El siguiente ejemplo requiere cookie de sesión y token CSRF obtenidos al ingresar; crea un registro en la base local configurada:

```bash
curl --fail-with-body \
  -X POST http://127.0.0.1:3001/api/departments \
  -H 'Content-Type: application/json' \
  -H 'Cookie: asistencia_session=<sesión>' \
  -H 'x-csrf-token: <token-CSRF>' \
  --data '{"name":"Administración"}'
```

No se aceptan campos adicionales ni se convierten números/booleanos a nombres. El contrato de entrada comprueba forma/caracteres; el caso de uso aplica el límite después de normalizar. No se usa `maxLength: 100` sobre texto bruto que podría ser NFD válido.

## Editar

`PUT /api/departments/:id`, JSON `{ "name": "Nuevo nombre" }` → **200**, mismo contrato de salida. Requiere ADMIN/HR, sesión y `x-csrf-token`. Conserva identificador y fecha de creación; aplica las mismas reglas de normalización y unicidad del alta. Un UUID inexistente devuelve 404.

## Eliminar

`DELETE /api/departments/:id` → **204**, sin cuerpo. Requiere ADMIN/HR, sesión y CSRF. La web pide confirmación explícita antes de enviar la solicitud. Un departamento con empleados o responsabilidades vinculadas devuelve 409 `DEPARTMENT_IN_USE`, sin eliminar registros relacionados. Las claves foráneas protegen también frente a operaciones concurrentes. Un departamento inexistente devuelve 404 `DEPARTMENT_NOT_FOUND`.

## Errores

Envelope común:

```json
{
  "error": {
    "code": "DEPARTMENT_NAME_EXISTS",
    "message": "Ya existe un departamento con ese nombre.",
    "requestId": "identificador-de-la-solicitud"
  }
}
```

| HTTP | Código                    | Significado                                                |
| ---- | ------------------------- | ---------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`        | Campos/tipos inválidos según contrato                      |
| 400  | `INVALID_DEPARTMENT_NAME` | Nombre inválido tras normalizar                            |
| 400  | `REQUEST_ERROR`           | JSON malformado u otra solicitud inválida                  |
| 409  | `DEPARTMENT_NAME_EXISTS`  | Nombre ya registrado, incluso bajo concurrencia            |
| 415  | `REQUEST_ERROR`           | Tipo de contenido no admitido                              |
| 500  | `INTERNAL_ERROR`          | Fallo interno o de persistencia, sin detalles SQL/conexión |

Las respuestas incluyen `x-request-id` y `Cache-Control: no-store`. Las fechas de respuesta son ISO UTC con milisegundos. Swagger UI: `/docs/`; especificación JSON: `/docs/json`, disponibles fuera de producción.

El listado cubre la consulta; no hay endpoint individual GET. La UI no reintenta automáticamente las escrituras. Si no recibe confirmación, permite actualizar el listado antes de volver a intentar. Los botones de edición/eliminación solo aparecen para ADMIN/HR.

## Verificación

`pnpm test:integration` cubre CRUD, validación estricta, Unicode, duplicados concurrentes, autorización/CSRF, bloqueo por referencias, persistencia y sanitización. `pnpm test:e2e` cubre formulario → API → PostgreSQL, recarga y duplicado en escritorio y móvil. Ambas suites usan exclusivamente bases `_test`.
