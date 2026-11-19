# Rediseño visual integral — avance del 19 de noviembre

El objetivo completo permanece abierto. Esta entrega avanza Empleados, cuyo diseño ya tenía una autorización específica, y concreta la [propuesta para las 22 rutas](../../superpowers/specs/2026-11-19-visual-redesign-design.md). No presenta toda la interfaz como rediseñada. La elección de dirección para el resto sigue pendiente.

## Empleados implementado

- Directorio amplio, búsqueda por nombre/número/puesto/departamento y filtros locales por departamento, estado y categoría. Cantidades reales y paginación local de diez registros.
- Tabla compacta, identidad por iniciales y estados con texto. Menú contextual accesible para consultar expediente, editar o eliminar; no simula fotografías, exportaciones ni estados de vacaciones.
- Expediente completo en panel de consulta. Alta/edición en SidePanel con los campos originales, foco inicial/restaurado, cancelación con decisión ante borrador, guardas de navegación y bloqueo durante envío/refetch.
- Confirmación de eliminación con foco, errores persistentes y restricciones del servidor. Se preservan los cinco grupos de invalidación y los mensajes ante un resultado no confirmado.
- Claro/oscuro y fondo Black & Gold existente, limitado a Empleados; tablas y formulario sólidos. Fondo opaco alternativo en colores forzados y transparencia reducida.

Fuentes principales: `features/employees/{employees-page,employees-directory,employee-form,employee-actions,employee-delete-dialog}.tsx` y reglas scoped de `styles.css`. Sin cambios de backend, contratos, migraciones, dependencias, lockfile, `.env` o datos empresariales.

## Evidencia y regresiones

- [Snapshot del frontend antes de cambiar producto](evidence/frontend-before.tar.gz). El snapshot ya contiene la primera prueba RED nueva, pero conserva el producto previo. [Comparación de fuentes](evidence/source-changes.json).
- [Check inicial](evidence/baseline-check.txt): 189 pruebas UI/unitarias y build. Árbol original sin commits; no se crea un commit inicial con trabajo ajeno.
- [RED inicial](evidence/directory-red.txt): el formulario aparecía permanentemente; [GREEN del flujo bajo demanda](evidence/directory-green.txt).
- [Integración PostgreSQL](evidence/integration.txt): 175 pruebas en 17 archivos aprobadas. La [primera ejecución E2E](evidence/initial-db-failure.txt) encontró la base efímera sin tablas; la integración aplicó las migraciones existentes exclusivamente sobre `_test` antes de repetir E2E.
- [CRUD real de identidad/empleados](evidence/crud-e2e.txt): 8 pruebas aprobadas en escritorio y móvil, con recarga/persistencia, contactos, número generado/conservado, CSRF, permisos y eliminación. Esta ejecución precede al refinamiento del menú; la ejecución final debe volver a acreditar esas interacciones.
- [Revisión independiente](evidence/review.md): detectó que `reset()` antes del refetch interrumpía el bloqueo. [Regresión RED](evidence/pending-red.txt) y [suite de Empleados GREEN](evidence/unit-employees.txt), 10 pruebas tras corregir el orden.

Las pruebas de negocio se adaptan al botón Nuevo empleado, menú contextual y consulta de datos completos en panel. Conservan sus aserciones de payload, normalización, CSRF, servidor, recarga, contactos y bloqueos. La prueba nueva de directorio crea doce registros ficticios en `_test`, comprueba filtros/paginación y los limpia al terminar.

La prueba de arranque de tema tenía un glob que no interceptaba `/src/main.tsx?t=...`. La [traza de fallo](evidence/bootstrap-test-failure.md) confirma que React sí había arrancado porque el recurso con parámetro no fue bloqueado. Se cambia a comparación de `URL.pathname` y se exige que la intercepción ocurra; permanecen las dos aserciones de tema anticipado y raíz vacía. Esto no modifica el bootstrap del producto.

## Verificación final

| Comando                                            | Resultado                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                                       | [Salida 0](evidence/check.txt): lint, arquitectura, formato, tipos, **191 pruebas** en 30 archivos y build.                                            |
| `pnpm test:integration`                            | [Salida 0](evidence/integration.txt): **175 pruebas** en 17 archivos sobre PostgreSQL `_test`.                                                         |
| `pnpm test:e2e`                                    | [Salida 1](evidence/e2e-full-first.txt): **75/78**, con los dos fallos del test de bootstrap y un fallo concurrente de Usuarios descrito abajo.        |
| Revalidación de bootstrap y Usuarios con un worker | [Salida 0, 4/4](evidence/revalidation.txt), escritorio/móvil. No se suma como cuatro casos nuevos ni se presenta como una suite global paralela verde. |
| `pnpm exec playwright test --workers=1`            | [Salida 0, **78/78**](evidence/e2e-serial.txt): suite completa escritorio/móvil. Configuración de dos workers permanece intacta.                       |

[22 capturas e índice/hash](evidence/screenshots.json), con directorio en siete anchos desktop y 390 móvil, ambos temas, paneles y estado anterior a abrir panel. Revisadas visualmente las vistas representativas de 1440/390, claro/oscuro y panel. [Escritorio oscuro](screenshots/desktop-directory-dark-1440.png) · [Móvil claro](screenshots/mobile-directory-light-390.png) · [Panel oscuro](screenshots/desktop-employees-dark-desktop.png).

La ejecución [interrumpida antes del refinamiento](evidence/e2e-interrupted-before-refinement.txt) se conserva y no se contabiliza como aprobada. Los avisos previos de `scrollTo` en jsdom y NO_COLOR/FORCE_COLOR no causaron fallos.

### Límite de la suite paralela de Usuarios

La [extracto sanitizado de la traza](evidence/users-response-summary.json) muestra un HTTP 200 de `/api/users` con una fila `roles: []`; el contrato la rechaza y la UI presenta error de carga. `identity/application/service.ts:listUsers` consulta usuarios y después sus roles por separado. Es compatible con una eliminación concurrente de fixtures entre ambas lecturas; no existe borrado de usuarios por API en el flujo del producto. La revalidación aislada del recorrido y después la suite completa de 78 casos con un worker pasan en ambos proyectos. No se cambió backend ni se relajó el contrato. La carrera de lectura/limpieza necesita un seguimiento específico; el gate global paralelo no se declara verde.

### Tamaño y rendimiento

El [build inicial](evidence/baseline-check.txt) y [final](evidence/check.txt) muestran CSS gzip 10.06 → 10.40 kB; chunk principal 122.86 → 122.90 kB; React 129.65 kB sin cambio. El chunk diferido de Empleados pasa de 3.75 a 8.11 kB gzip, con nueva partición compartida de Radix. Esa cifra no equivale al coste total de la ruta. [Inventario de recursos del build](evidence/bundle.json), con gzip calculado por Python y parámetros de compresión distintos a los del resumen Vite.

Se añade una comparación de 24 cargas de Empleados con compilaciones explícitas `NODE_ENV=production` y APIs simuladas: ver [protocolo, resultados y límites](PERFORMANCE.md). No sustituye mediciones de las otras rutas, backend real o INP. La imagen existente de 9050 bytes se usa solo en Empleados oscuro.

## Alcance pendiente

El resto del rediseño sigue la propuesta integral: patrones compartidos, acceso/dashboard, asistencia/incidencias, planificación, responsables, solicitudes/aprobaciones/vacaciones y administración; después, revisión transversal de las 22 rutas. Departamentos y Usuarios conservan su trabajo previo.

Las capturas de navegador de esta entrega no acreditan por sí solas producción, WCAG completa, lector de pantalla real, GPS físico, rendimiento de campo o metas globales de LCP/CLS/INP. El presupuesto del proyecto continúa abierto. La app nativa y el despliegue permanecen fuera del rediseño web.
