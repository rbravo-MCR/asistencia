# Ejecución UX clara — 19-11-2026

Objetivo activo del usuario: «mejora la experiencia de usuario con un diseño moderno, dime si necesitas imagenes para guiarte». Se conserva la identidad MCR existente y la autorización para mejorar la aplicación; no hacen falta imágenes externas para resolver los problemas observados. No se solicita reaprobar cambios reversibles del alcance ya pedido.

## Pre-flight

- Repo sin HEAD, rama setup/base-tecnica y árbol previo sin seguimiento. Snapshot de frontend/E2E antes en `docs/verification/2026-11-19-ux-clarity/source-before.tar.gz`; no commit inicial ni worktree vacío.
- Documentos: AGENTS, flujos y Definition of Done actuales; las reglas confirmadas sustituyen descripciones históricas en conflicto.
- Auditoría actual: siete capturas de Inicio, plantillas, asignación/editor, Vacaciones y Solicitudes/editor. Se inspeccionaron todas. Se distingue diagnóstico de interfaz de certificación de accesibilidad.
- Product Design sin contexto persistido; no se crea memoria. IAB y demás navegadores integrados no disponibles. Se usa Chromium del proyecto en el entorno local ya autorizado, sin escrituras de negocio para la captura.
- Diseño escrito y builder-check independiente: «nothing important left». Plan creado. No backend, dependencias, contratos, migraciones o datos operativos.

## Rulings

- Refinar las tareas dentro de la identidad aprobada, en lugar de volver a generar tres marcas distintas — el problema reportado es comprender y encontrar acciones, y el usuario pide ejecución. Coste si se interpreta mal: acabado visual revisable y reversible.
- Ejecución híbrida: principal integra y conserva solicitudes/vacaciones; dispatching-parallel-agents para planificación y navegación/Inicio con archivos exclusivos y contrato de intención fijado. No servidores ni gates globales concurrentes. Revisión independiente al final.
- La intención usa `create=VACATION|PERMISSION|JUSTIFICATION` y `period`1–100 solo para vacaciones; abre UI, nunca autoriza o envía. Se consume con replace sin cambiar el estado local inicial, evitando reapertura al volver.
- Mantener las mutaciones y cifras originales. Aprobar no es otra cantidad disponible; disfrutado es subconjunto de aprobado. No sumar períodos ni personas para presentar un saldo ficticio.

## Estado

- Tarea1 navegación/Inicio: implementada y validada.
- Tarea2 planificación: implementada y validada.
- Tarea3 intención/vacaciones: implementada y validada.
- Tarea4 solicitudes/revisión: implementada y validada.
- Tarea5 QA integral: completada con evidencia funcional, visual y de laboratorio.

## Implementación integrada

- Task1: navegación por tarea, aliases con acentos, Inicio compacto y accesos separados según permiso. CTA de administración abre Equipo; lectores ven Mi horario, gestores Consultar horarios. Focal 26/26 y refinamiento dashboard9/9, ESLint.
- Task2: Asignar turno, guía guardar/publicar, plantillas y resumen reactivo reales. Feedback nuevo del usuario sobre centro rechazado: se comprobó centro activo sin autorización del empleado indicado; no se editaron datos reales. Pendiente fecha de autorización indicada por el usuario. Se añadió filtro por categoría y autorizaciones vigentes, mensajes y enlace; Home office conserva null. Focal26/26 y ESLint.
- Task3: parser de intención RED→GREEN2/2; personal/equipo y filtro, tarjetas de días disponibles/en revisión e historial explicado. Acciones administrativas separadas, sin modificar saldos ni políticas.
- Task4: revisar sin POST/UUID, editar conserva controles/archivos, confirmación única real, cierre después del refetch. Archivos con selección en español y obligatorio/opcional correcto. Aviso de vínculo explica capacidades. Se corrigió feedback de éxito anterior en borrador nuevo (RED→GREEN). Enlace frío con período tardío conserva preselección y descarte reversible mediante baseline de valores iniciales explícitos (RED→GREEN). Focal combinado Requests+intent27/27.
- E2E requests adaptado con revisión previa y aserciones de cifras visibles en reserva/aprobación; conserva assertionsAPI/CSRF/privacidad/HEAD_ONLY/persistencia. Nueva prueba de descubrimiento y siguiente acción sin vínculo.
- Revisión independiente del cambio completo: sin hallazgos P1/P2 confirmados; estática, no reemplaza gates ni QA visual.
- Task5 en curso: check, PostgreSQL, navegador serial, capturas y producción.

## Cierre funcional

- `pnpm check` final: exit0, 258/258 pruebas en37 archivos, ESLint/fronteras/formato/tipos y builds completos. PostgreSQL175/175. E2E global90/90, seguido de4 focales para enlace a autorizaciones conservando borrador (2 de descubrimiento repetidas). No se suman como94 pruebas únicas.
- Revisión posterior: copy de estado unknown veraz y datos de permiso limitados al tipo correspondiente, sin P1/P2 en revisión independiente. Vacío personal con siguiente acción validado RED→GREEN; requests27 + planning26 + intent2 =55 focales.
- Capturas finales60: 10 estados ×3 anchos(320/390/1440) ×2 temas. Cero POST de negocio y errores JS; sin overflow global. Inspección manual representativa de Inicio, plantillas, calendario/editor, vacaciones, solicitudes/editor y revisión en móvil/escritorio y ambos temas. No se afirma inspección manual de las60 ni certificación WCAG.
- Captura inicial interrumpida por servidor dev terminado exit143; reiniciado y comprobada readiness200. Segundo intento alcanzó límite de login429 por autenticar cada perfil; helper corregido para reutilizar una sesión autorizada, respetando el límite. Captura final completa60/60. Ninguna de estas incidencias se cuenta como fallo de negocio.
- el empleado reportado: centro principal activo, sin autorización del empleado. Se pidió fecha de inicio y no se alteraron datos reales a falta de respuesta. El frontend avisa antes de guardar y mantiene validación del servidor.

- Producción: builds comparables con NODE_ENV=production;72 cargas,24 capturas, cero errores JS y overflow. Peor CLS final0.0164 y LCP788ms en laboratorio. JS inicial203.40KiB gzip: presupuesto preliminar200KiB continúa abierto; no se afirmó cumplido. Revisión local lista; sin despliegue.
