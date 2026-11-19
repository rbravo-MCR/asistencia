# Generación de números de empleado

## Función del backend

El módulo Empleados exporta `generateEmployeeNumber(db): Promise<string>`. Recibe la conexión Drizzle o la transacción del alta:

```ts
import { generateEmployeeNumber } from './modules/employees/index.js';

const employeeNumber = await generateEmployeeNumber(db);
// "000001", "000002", …
```

PostgreSQL reserva cada número mediante un contador persistente y un UPSERT atómico. Las llamadas concurrentes obtienen números distintos. Se conserva un mínimo de seis dígitos, sin truncar al superar `999998`. `999999` está reservado para el administrador; el siguiente es `1000000`.

El contador considera los números existentes formados solo por dígitos, incluso con ceros iniciales. Los números alfanuméricos existentes se conservan. Eliminar empleados no retrocede el contador. Una reserva independiente consume un número aunque no se cree un empleado; dentro de una transacción, la reserva se revierte si falla el alta. No se garantiza una serie sin huecos.

## Alta por API

`POST /api/employees` permite omitir `employeeNumber`; el servicio lo genera dentro de la misma transacción que guarda el expediente. Mantiene los permisos ADMIN/HR, CSRF y las demás validaciones. Un número explícito sigue permitido por compatibilidad; una cadena vacía es inválida y `999999` no se puede asignar a empleados.

La respuesta 201 incluye el número definitivo en `employeeNumber`. `PUT /api/employees/:id` sigue requiriendo el número: editar no genera otro. No hay un endpoint público para consumir números.

El formulario web de alta omite el número y avisa que se generará al guardar. El listado muestra el número devuelto por el servidor, que permanece al recargar. La edición conserva el número existente. La creación automática de cuentas de empleados queda pendiente.

## Acceso del administrador

El identificador del administrador inicial es `999999`. La contraseña se conserva; para instalaciones nuevas se captura con `pnpm admin:create`. El formulario de ingreso acepta número de usuario o correo. La API admite `{ identifier, password }` y mantiene `{ email, password }` para clientes existentes. No se añade un rol nuevo.

Aplicar la migración con `pnpm db:migrate` antes de arrancar la versión nueva. Las cuentas existentes conservan sus datos; asignar un identificador a una cuenta ya creada requiere una operación administrativa explícita.
