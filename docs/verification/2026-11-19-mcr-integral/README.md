# Rediseño visual integral MCR — verificación local

Fecha: 19-11-2026. **Rediseño visual cerrado y verificado localmente.** Diseño aprobado explícitamente por el usuario. Alcance: las 22 rutas existentes, navegación, acceso público y estados compartidos. Este informe documenta el cierre visual local; no acredita despliegue ni configuración operativa de producción.

## Resultado y cambios

Se extiende la identidad MCR con navegación negra, acciones amarillas, Google Sans local y temas claro/oscuro/sistema. Cada módulo conserva sus datos y reglas reales, con encabezados consistentes, jerarquía específica, formularios contextuales, confirmaciones, errores persistentes y adaptación a móvil. Las 22 rutas tienen composición revisada; no se atribuye el alcance a un cambio global de CSS.

La búsqueda de secciones usa únicamente destinos autorizados; soporta teclado y devolución de foco. Las operaciones sensibles conservan el borrador y bloquean salida durante envío; ante marcaje desconocido el reintento mantiene UUID y payload. El cambio de usuario/alcance cancela y retira caché privada antes de mostrar la nueva sesión, y desmonta exclusivamente el contenido privado. Empleados retira detalles que ya no pertenecen al listado vigente.

No se añadieron dependencias ni se cambiaron backend, contratos, migraciones, lockfile o configuración operativa. Los datos de E2E pertenecen exclusivamente a PostgreSQL `_test`; las fixtures limpian sus usuarios y registros operativos. La auditoría de pruebas conserva los eventos de trazabilidad. El checkout sigue sin HEAD y sin commit inicial; no se mezcló el trabajo previo en un commit artificial.

## Cobertura de pantallas

Los estados de red, 403/409, borrador, pending, resultado desconocido y foco se acreditan por las pruebas de cada dominio; la matriz geométrica no inyecta todas las combinaciones de estado en cada ruta. La recuperación E2E usa código real, conserva el formulario ante rechazo y permite pegar la nueva contraseña; verifica el consumo del código en PostgreSQL sin agotar el límite de solicitudes de recuperación.

La matriz `redesign-routes.spec.ts` abre las 20 rutas de aplicación con una cuenta ADMIN y empleado sintético vinculado. Captura ambos temas a 320, 360, 390, 768, 1024, 1280 y 1440 px en desktop; el proyecto mobile añade 390 px. `redesign-foundation.spec.ts` cubre acceso y recuperación en los mismos siete anchos/temas. Se comprueba un único main, h1 visible, carga finalizada, ausencia de overflow global y errores JavaScript. Las tablas deliberadamente horizontales conservan desplazamiento interior.

| Ruta                        | Composición revisada                           | Evidencia funcional adicional                            |
| --------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `/ingresar`                 | Acceso MCR y visibilidad de contraseña         | identity-employees, appearance, router                   |
| `/recuperar`                | Instrucciones y nueva contraseña               | session, auth-pages; confirmación conservada             |
| `/`                         | Jornada, pendientes y resumen autorizado       | dashboard, permisos empleado/HR                          |
| `/asistencia`               | Marcaje, guía y confirmación con hora servidor | attendance; GPS presencial, remoto sin GPS, reintento    |
| `/incidencias`              | Rango, evaluación y motivo                     | attendance-pages; borrador al cambiar rango              |
| `/calendario`               | Mes/agenda y edición contextual                | planning, steps10-12; publicación/snapshot               |
| `/turnos`                   | Plantillas, versiones y festivos               | planning, official-holidays                              |
| `/empleados`                | Directorio y expediente contextual             | organization-pages, employees-design, identity-employees |
| `/departamentos`            | Directorio y panel de edición                  | departments-design, departments                          |
| `/responsables`             | Vigencias y asignación/revocación              | organization-pages, identity-employees                   |
| `/solicitudes`              | Historial y solicitud contextual               | requests, request-write; evidencia privada               |
| `/aprobaciones`             | Decisiones autorizadas e historial             | requests; jefatura y cadena vigente                      |
| `/vacaciones`               | Períodos y movimientos                         | requests; reserva/consumo/devolución                     |
| `/avisos`                   | Bandeja, leído y destino seguro                | notifications, steps10-12                                |
| `/ubicaciones`              | Centros, autorizaciones y comprobación GPS     | locations, location-editor, steps10-12                   |
| `/configuracion`            | Destinos y diagnósticos reales                 | configuration, dashboard                                 |
| `/configuracion/asistencia` | Reglas agrupadas y versión                     | attendance-policy, dashboard                             |
| `/politicas-ausencias`      | Políticas/versiones y tipos                    | requests, request-panel                                  |
| `/usuarios`                 | Directorio, filtros y edición                  | identity, shell-users, super-admin                       |
| `/auditoria`                | Filtros, paginación y detalle sanitizado       | audit-page, steps10-12                                   |
| `/cuenta`                   | Identidad y seguridad separadas                | identity, session, redesign-foundation                   |
| `/estado`                   | Disponibilidad real de servicios               | router, base                                             |

404 conserva navegación y retorno; el acceso denegado, la sesión en verificación, carga y error comparten patrones MCR. Los listados no inventan métricas, fotografías, exportaciones ni estados.

## Revisión visual e interacción

Se inspeccionaron manualmente con `view_image` 72 capturas de las 20 rutas de aplicación: 5 rutas de equipo/planificación ×4, 7 de operación/solicitudes/cuenta/inicio ×4 y 8 administrativas ×3. Cubren claro/oscuro a 1440 y móvil 320 (administración: claro 320). Acceso y dashboard también tuvieron revisión visual en la fase foundation. La revisión detectó y corrigió refrescos repetidos en Calendario, filtros truncados de Usuarios/Empleados, jerarquía del vacío de Vacaciones y falta de pista de desplazamiento en Auditoría.

Las capturas fullPage muestran la barra inferior fija a la altura del viewport original; la superposición en esa imagen no acredita pérdida permanente de contenido. El contenido dispone de padding inferior y se puede desplazar. El comportamiento de menú/panel, Escape, Tab y devolución de foco se comprueba además en pruebas interactivas; no se deduce solo de las imágenes.

Se reprodujo recorte del encabezado al ampliar texto raíz a 200 %; se permitió crecer/envolver el header conservando 72 px en tamaño normal. La regresión pasa y permite usar búsqueda por teclado. Es ampliación automatizada de texto y reflow a 320 px, no certificación de zoom físico en todos los navegadores.

## Verificación ejecutada

El gate `pnpm check` pasó con 236 pruebas en 36 archivos, incluyendo lint, límites de dependencias, formato, tipos y build. La integración PostgreSQL pasó con 175 pruebas en 17 archivos. La suite E2E completa pasó sus 88 casos en escritorio y móvil, sin reintentos, en 9 minutos. Los intentos fallidos o interrumpidos se preservan como diagnóstico y no se cuentan como ejecuciones aprobadas.

| Comando                                 | Resultado                                                             | Salida                                |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| `pnpm check`                            | PASS; 236 pruebas, 36 archivos; lint, límites, formato, tipos y build | [check.txt](evidence/check.txt)       |
| `pnpm test:integration`                 | PASS; 175 pruebas, 17 archivos, PostgreSQL                            | [postgres.txt](evidence/postgres.txt) |
| `pnpm exec playwright test --workers=1` | PASS; 88 casos, desktop/mobile, retries 0                             | [e2e.txt](evidence/e2e.txt)           |

Después de los últimos ajustes, `pnpm lint` y `pnpm format:check` también pasan; la compilación explícita de producción incluye las fuentes finales.

Se mantienen las aserciones de payload, CSRF, permisos, evidencia privada, snapshots y persistencia al adaptar selectores a los nuevos paneles. Los fallos anteriores de selección de nodos públicos, selector relativo de Auditoría y una llamada redundante que agotaba el rate limit de recuperación están separados en los logs de diagnóstico. La comprobación del consumo del código usa PostgreSQL y conserva el límite real del endpoint.

Se guardaron **512 PNG** del gate final, con [manifiesto y hashes](evidence/screenshots.json). Selecciones para revisar: [dashboard oscuro](screenshots/routes-desktop/inicio-dark-1440.png), [acceso claro](screenshots/auth-desktop/login-light-1440.png), [recuperación móvil](screenshots/auth-desktop/recover-dark-320.png), [Empleados](screenshots/routes-desktop/empleados-light-1440.png), [Calendario móvil](screenshots/routes-desktop/calendario-light-320.png) y [Usuarios móvil](screenshots/routes-desktop/usuarios-light-320.png). La matriz de 22 rutas aporta 352 capturas; las restantes corresponden a flujos, paneles y estados. Captura no equivale a inspección manual: se revisaron las 72 indicadas y selecciones finales de los acabados corregidos.

## Rendimiento

Comparación reproducible de compilaciones `NODE_ENV=production`, baseline `source-before.tar.gz` y fuentes finales; mismas dependencias, assets y datos sintéticos. Tres corridas emparejadas por login/dashboard/asistencia, tema y viewport 390/1440: 72 cargas frías. HTTP sin caché y APIs simuladas con 120 ms; sin CPU/red limitada ni aislamiento del host. Se registran LCP, CLS, overflow y errores; no INP de campo ni rendimiento del backend.

La medición final pasó 72 cargas sin errores ni overflow: peor CLS 0.0642 y peor LCP 860 ms en este laboratorio. La corrección de altura del contenido retira el salto del footer; se conservan la primera medición y la traza de diagnóstico. El JS inicial es 203.41 KiB gzip y supera ligeramente el presupuesto preliminar 200 KiB; no se declara cumplido. Ver [método, tabla comparativa y límites](PERFORMANCE.md).

El build normal hereda NODE_ENV del entorno y puede incluir React de desarrollo. Por eso las mediciones y comparación de bundle usan explícitamente producción y directorios temporales propios, sin reemplazar la configuración del usuario.

## Trazabilidad y límites

`evidence/source-changes.json` compara fuentes frontend/E2E contra el snapshot de esta fase. `protected-current-sha256.json` registra hashes actuales de archivos protegidos, sin contenido de secretos; al ser un manifiesto de cierre, por sí solo no prueba una comparación anterior/posterior. La comparación histórica adicional con el manifiesto del 18 de noviembre coincide en los 13 archivos protegidos presentes en ambas fuentes; otros 100 no figuraban en aquel manifiesto y no se presentan como comparados. La ausencia de HEAD impide usar git diff como registro completo del trabajo anterior.

La suite E2E se ejecuta con un worker. Una carrera anterior de fixtures con dos workers está documentada en la fase previa; no se afirma corregida ni se cambia la configuración por defecto. PostgreSQL real y su base `_test` se distinguen de producción. GPS se simula mediante contexto del navegador; no se probó GPS físico, Safari ni teléfono real. Contraste automatizado y foco no equivalen a certificación WCAG. La app Android continúa fuera de este rediseño web.
