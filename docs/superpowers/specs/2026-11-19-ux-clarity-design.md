# MCR — experiencia orientada a tareas

## Intención y autorización

El usuario pide mejorar la experiencia y el diseño moderno porque no encuentra la asignación de turnos ni comprende los saldos de vacaciones. Pide ejecutar la mejora como Senior UX/UI y pregunta si hacen falta imágenes. La aplicación existente y sus capturas actuales son la referencia; no hacen falta imágenes externas para resolver estas tareas. Se conserva la identidad MCR ya aprobada. Este documento registra decisiones de implementación del agente bajo la autorización actual de mejora, sin atribuir al usuario elecciones de detalle no realizadas.

## Diagnóstico observado

Captura nueva de siete pasos en `docs/verification/2026-11-19-ux-clarity/before/`: inicio, plantillas, calendario, formulario de asignación, días disponibles, solicitudes y formulario de solicitud. Se inspeccionaron todas las imágenes. El navegador integrado no está disponible; se utilizó Chromium del proyecto sobre la aplicación local con cuenta ficticia autorizada, sin enviar operaciones de negocio.

- Inicio prioriza hero e indicadores y no explica cómo realizar las tareas administrativas o pedir vacaciones.
- Turnos/Calendario son nombres ambiguos: la primera ruta configura plantillas; la segunda asigna y publica a empleados. La acción Nuevo borrador no revela ese propósito. El vacío genérico desplaza el calendario.
- Vacaciones mezcla gestión y consulta personal, da igual peso a seis cantidades y no ofrece solicitar vacaciones. Saldo/reservado/disponible no indican qué se resta ni que disfrutado es parte de aprobado.
- Solicitudes no ofrece entradas por tarea. El formulario presenta fechas antes del período y muestra varios Actualizar listado sin función clara dentro del editor. No hay resumen previo al envío.
- La falta de vínculo a empleado se expresa como bloqueo sin siguiente acción específica para un administrador.

## Enfoques considerados

1. Renombrar únicamente menús: bajo coste, pero no resuelve los formularios ni los saldos.
2. Clarificar navegación, accesos por tarea y flujos contextualizados dentro de MCR: elección técnica recomendada y adoptada; resuelve las dudas observadas y conserva la aplicación.
3. Otra identidad visual completa: no aporta a los problemas observados y repetiría trabajo ya aprobado. Se descarta.

## Resultado esperado

La persona encuentra dónde asignar un turno desde Inicio y navegación; distingue plantilla de asignación y sabe que el borrador debe publicarse. Puede iniciar una solicitud de vacaciones desde Inicio, Vacaciones o Solicitudes, elegir un período con disponibilidad y revisar datos antes de enviar. Comprende días disponibles, días en revisión y uso aprobado; consulta su información separada de la gestión de equipo.

## Cambios

### Navegación e inicio

Nombres por tarea: Asignación de turnos, Plantillas de turno, Vacaciones y permisos, Días disponibles. Mantener las rutas, autorización y atajos existentes; buscador con términos alternativos (calendario, turnos, saldo, vacaciones, pedir, horario). Inicio con acciones explícitas para consultar horario, solicitar vacaciones y, cuando esté autorizado, asignar turnos/gestionar días. Ayudas breves, sin nuevos indicadores ficticios.

### Planificación

Acción Asignar turno, encabezado y explicación distinguiendo plantilla, borrador y publicación. Guía breve de tres pasos y enlace a plantillas. Vacío específico útil y sin repetición de tarjetas genéricas. Formulario agrupado con persona/horario/fecha, información seleccionada de la plantilla y restricciones explicadas sin jerga del servidor. Conservar todos los campos, cancelación, movimientos, mes/agenda, filtros y publicación explícita. Plantillas enlaza a la asignación real; festivos se preservan.

### Vacaciones

Separar Mis días y Equipo cuando hay permiso de gestión; equipo con filtro de empleado y acciones administrativas claras. Destacar disponibilidad por período, en revisión separado y uso aprobado como historial. Desglose accesible: disponible = saldo restante − reserva; aprobado ya se descontó del saldo y disfrutado forma parte de aprobado. Mostrar solamente cifras del contrato. Acceso Solicitar vacaciones abre creación contextual sin enviar automáticamente. Sin vínculo/saldo/política, explicación y siguiente acción según permiso; no inventar ceros ni concesiones.

### Solicitudes

Entradas claras para vacaciones, permisos y justificaciones, además del historial actual. Una intención de navegación abre el formulario apropiado; no crea registros ni reabre un editor cerrado al volver. Agrupar tipo/período/fechas/motivo, sin refrescos redundantes en éxito. Etapa de revisión con fechas, período y motivo antes de enviar; editar conserva todos los campos y archivos. No calcular días definitivos en el cliente. Adjuntos siguen siendo opcionales/obligatorios según configuración y privados. Preservar selección de tipo, restricciones por horas, resultado desconocido, UUID/payload, borrador y bloqueo pending/refetch. Confirmación real y destino para seguir el estado.

## Diseño y accesibilidad

MCR negro/amarillo, Google Sans y temas existentes. Superficies sólidas, jerarquía por acciones e información, números legibles, espacios contenidos. No imágenes decorativas para sustituir instrucciones. Lucide existente. Responsive 320–1440; foco, Tab, Escape y retorno; controles de selección con nombres y estados claros. No color como única señal. Secciones y ayudas plegables para no saturar.

## Límites

Solo frontend, pruebas y documentación. Sin dependencias, backend, contratos, migraciones, lockfile, `.env`, datos operativos o cambios de permisos. No eliminar capacidades existentes ni alterar reglas: GPS solo presencial, HEAD_ONLY e histórico, no autoaprobación, snapshots, CSRF, sesión/alcance y saldos por período. No crear nuevos registros de prueba en desarrollo durante esta fase; las escrituras de verificación se aíslan en PostgreSQL `_test`. Checkout sin HEAD: snapshot antes, sin commit inicial ni worktree vacío.

## Verificación y cierre

Pruebas de intención/descubrimiento, separación personal/equipo, saldos no aditivos, flujo de revisión/edición, pending/descarte/403/409/unknown, sin dobles envíos y misma idempotencia. Capturas antes/después inspeccionadas de los pasos con datos sintéticos actuales; móvil/escritorio, ambos temas y reflow de las rutas afectadas. `pnpm check`, integración PostgreSQL y E2E serial pertinente/global según alcance de navegación. Verificación real de asignar/guardar/publicar y solicitar/revisar/enviar/retiro en `_test`. Medición de producción sobre Inicio/Vacaciones/Solicitudes y mantenimiento de CLS, sin afirmar métricas de campo. Dejar el servidor de desarrollo disponible para revisión. Objetivo completo solo tras demostrar el resultado, sin pedir otra aprobación para cambios reversibles ya autorizados.
