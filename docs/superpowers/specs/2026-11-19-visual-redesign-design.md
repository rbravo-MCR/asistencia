# Rediseño visual integral de Asistencia

Fecha: 19-11-2026. Objetivo solicitado: rediseñar toda la parte visual del proyecto con una estética moderna, vistosa y minimalista.

Estado: **aprobado por el usuario el 19-11-2026**, con respuesta explícita «aprobado». Se adopta la alternativa recomendada de extender y pulir MCR para las 22 rutas. Empleados conserva su autorización y trabajo previo; el resto continúa conforme a este diseño y al plan de ejecución.

## Dirección y alternativas

1. **Extender y pulir MCR (recomendada):** conservar navegación negra, selección y acciones amarillas, Google Sans local y temas claro/oscuro/sistema. Usar Departamentos y Usuarios como base de directorios y el panel de Empleados como referencia de detalle. Ventaja: continuidad de marca y patrones consistentes. Coste: adaptar cada flujo operativo, no basta con sustituir CSS.
2. **Replanteamiento completo:** rediseñar también shell, tokens y pantallas recientes. Permite otra composición, pero exige elegir una referencia nueva y repetir las verificaciones de navegación, temas y contraste.

El usuario aprueba la propuesta que desarrolla la primera alternativa: extender y pulir MCR. La segunda alternativa se conserva como opción considerada y descartada.

## Intención y alcance

Una sola aplicación web para gestionar personal, asistencia, planificación, solicitudes y administración. Cada pantalla debe expresar su propósito, el estado real y la acción disponible, con lectura cómoda y una jerarquía consistente. Escritorio para gestión intensiva; web móvil para consultar y actuar con facilidad.

El alcance incluye las **22 rutas existentes**, sus formularios, paneles, vacíos, carga, errores, confirmaciones y accesos denegados; también 404 y fallos de ruta. La app nativa continúa siendo una etapa independiente. El cierre del objetivo exige revisar todas las rutas, no solamente Empleados ni los componentes compartidos.

## Lenguaje visual propuesto

- Logo original y siete colores existentes. Negro y amarillo dan identidad; blanco/gris o carbón sostienen el trabajo diario. Los colores semánticos indican estados con texto e icono.
- Títulos de 28–32 px en escritorio y 24–28 en móvil; cuerpo de 14–16 px. Escala de espacios de 4 px; controles de 44 px cuando el espacio lo permita.
- Workspace amplio, hasta 1600 px como referencia general. Empleados puede usar 1800 px por la densidad de sus columnas. Reducir tarjetas anidadas y formularios permanentes que compiten con listados.
- Tablas y formularios sólidos. Ahumado y profundidad solo en acceso, encabezado, hero y superficies flotantes previstas por las guías. Efectos estáticos, fallback opaco y preferencias de movimiento/transparencia reducidos.
- Directorios: encabezado con una acción principal, búsqueda y filtros del listado real, encabezados legibles, acciones con nombres accesibles y acceso a expediente completo. Paginación local explícita únicamente cuando aporta; paginación de servidor donde el contrato ya existe.
- Edición secundaria en panel lateral con desplazamiento interno y pie de acciones visible. Cambios sin guardar requieren decisión; no se permite cerrar o navegar durante un envío. Conservar borrador y errores si falla la operación.

## Composición por ruta

| Ruta                        | Composición y resultado esperado                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/ingresar`                 | Acceso con identidad MCR, panel legible, mostrar/ocultar contraseña accesible, gestores y pegado admitidos, error persistente y estado de sesión.                        |
| `/recuperar`                | Mismo lenguaje del acceso; instrucciones del código temporal, nueva contraseña y confirmación real.                                                                      |
| `/`                         | Saludo y fecha/hora del servidor; jornada personal protagonista si existe; pendientes decidibles y enlaces reales por alcance. Resumen de equipo cuando esté autorizado. |
| `/asistencia`               | Turno, modalidad y acción disponibles primero; confirmación duradera con hora servidor, historial y recuperación ante incertidumbre.                                     |
| `/incidencias`              | Rango claro, evaluación original, motivo y resolución separados; detalle y acciones autorizadas.                                                                         |
| `/calendario`               | Navegación temporal compacta, mes legible y agenda útil en móvil; editor separado, estados y confirmaciones.                                                             |
| `/turnos`                   | Plantillas y versiones claramente diferenciadas; alta/edición contextual; festivos como sección real del módulo.                                                         |
| `/empleados`                | Directorio con búsqueda, departamento/estado/categoría, datos compactos, detalle completo y alta/edición lateral conforme a la referencia existente.                     |
| `/departamentos`            | Conservar referencia, iconos y CRUD actual; revisar consistencia transversal.                                                                                            |
| `/responsables`             | Listado de responsabilidades y vigencias, titular/suplente/dirección explícitos, asignación y revocación contextual.                                                     |
| `/solicitudes`              | Historial primero; nueva solicitud contextual por tipo, restricciones, evidencia y errores conservados.                                                                  |
| `/aprobaciones`             | Pendientes decidibles primero; detalle con paso vigente, motivo y resultado. Historial separado visualmente.                                                             |
| `/vacaciones`               | Períodos y movimientos separados, cantidades del servidor y administración según capacidad.                                                                              |
| `/avisos`                   | Bandeja legible con no leídos, marcar uno/todos y destino interno seguro.                                                                                                |
| `/ubicaciones`              | Centros y autorizaciones organizados; comprobación bajo demanda claramente separada de la configuración.                                                                 |
| `/configuracion`            | Grupos con títulos, destinos y diagnóstico por severidad real, sin tarjetas decorativas repetidas.                                                                       |
| `/configuracion/asistencia` | Formulario ordenado por reglas, unidades visibles y efecto sobre controles nuevos.                                                                                       |
| `/politicas-ausencias`      | Políticas/versiones y condiciones visibles; edición contextual por tipo.                                                                                                 |
| `/usuarios`                 | Conservar directorio y panel actual, revisar coherencia, foco y protección de cuentas.                                                                                   |
| `/auditoria`                | Filtros claros, paginación existente y detalle sanitizado legible.                                                                                                       |
| `/cuenta`                   | Identidad y acceso, cambio de contraseña y salida con feedback independiente.                                                                                            |
| `/estado`                   | Disponibilidad real de servicios con jerarquía visual equivalente al resto.                                                                                              |

404, carga y error de ruta deben conservar navegación y acciones de recuperación reales.

## Arquitectura y límites

Continuar React/TanStack Router/Query, RHF/Zod, Tailwind y Radix existentes. Las features poseen consultas, permisos y mutaciones; los componentes visuales reciben datos y callbacks. Reutilizar SidePanel y primitivas; extraer patrones compartidos al encontrar consumidores reales. Sin dependencias nuevas para efectos o tablas.

Conservar backend, contratos, migraciones, lockfile, `.env` y datos operativos. Preservar CSRF, caché por sesión, alcance, aprobación HEAD_ONLY nueva/HEAD_DIRECTOR histórica, snapshots, UUID/payload en reintentos, GPS únicamente presencial, nocturnos, `LATE_ABSENCE` y saldos por período. No crear exportaciones, fotografías, gráficas, estadísticas, reportes o estados de empleado que el contrato no ofrece.

La rama actual no tiene commits y el proyecto está sin seguimiento. Conservar snapshot de fuentes y no crear un commit inicial que mezcle trabajo anterior. Una autorización de rediseño no autoriza despliegue ni cambios de negocio.

## Secuencia de ejecución

1. Completar Empleados, ya autorizado, y verificar sus interacciones y persistencia.
2. Con la dirección integral ya aprobada: patrones comunes, acceso, dashboard y búsqueda local de rutas autorizadas.
3. Asistencia/incidencias, calendario/turnos y responsables.
4. Solicitudes/aprobaciones/vacaciones y administración restante.
5. Recorrido transversal de las 22 rutas, estados, temas, tamaños y regresión; cierre con evidencia, no por cobertura nominal de archivos.

Cada bloque debe quedar utilizable antes del siguiente. Un cambio global de estilos no acredita completar las composiciones específicas.

## Evidencia necesaria para cerrar

- `pnpm check`, integración PostgreSQL `_test` y E2E pertinentes con comandos y salida reales. El entorno de pruebas recién iniciado requiere migraciones; no confundir readiness con esquema preparado.
- Capturas revisadas de las 22 rutas y estados representativos en ambos temas; responsive 320/360/390/768/1024/1280/1440, zoom 200 %, teclado, foco y retorno tras paneles/confirmaciones.
- Probar pérdida de red, 403/409, pending sin doble envío, conservación de borrador y resultado desconocido en operaciones sensibles. Ningún éxito visual sin aceptación del servidor.
- Confirmar que las pruebas de negocio siguen comprobando normalización, payload, CSRF, persistencia, permisos y errores después de adaptar los selectores al nuevo flujo.
- Medir build de producción frente al baseline: bundle, cargas frías de login/dashboard/asistencia y CLS. Las metas de las guías siguen siendo metas hasta su medición; no inventar Lighthouse, INP de campo, GPS físico ni certificación de accesibilidad.

Las decisiones menores de espaciado, iconos Lucide y orden visual dentro de cada grupo quedan a criterio de implementación, respetando esta dirección. Cualquier cambio de marca, operación o contrato requiere una nueva decisión explícita.
