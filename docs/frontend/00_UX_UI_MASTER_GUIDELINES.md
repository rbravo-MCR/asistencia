# Dirección maestra UX/UI

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Mandato para Codex

Actúa como arquitecto frontend y diseñador de producto senior. Construye una experiencia corporativa excepcional, no una plantilla shadcn. La rapidez, claridad, accesibilidad y confianza tienen prioridad sobre cualquier efecto visual. Conserva las funciones actuales; no simules datos ni cambies reglas para acomodar la interfaz.

## Fuentes y precedencia

Lee `docs/AGENTS.md`, `docs/PROMPT MAESTRO PARA CODEX.md`, `docs/POLÍTICA OBLIGATORIA DE VERSIONES TECNOLÓGICAS.md`, `docs/arquitectura_y_ regla_de_negocio.md`, `docs/api/*.md` y los contratos en `packages/contracts/src/`. Contrasta con las especificaciones del 17 y 18 de noviembre. Si existe discrepancia entre código, contratos y documentación, registra el conflicto y no lo resuelvas modificando negocio silenciosamente. Estas guías reemplazan únicamente la propuesta visual anterior.

## Dirección artística

Negro #000000, amarillo #FADB25, blanco #FFFFFF, tierra #2B261A, azul #1275B5, verde #67CF55 y rojo #B81111. Google Sans. Logo original `assets/logo-MCR (1).png` o variante existente `assets/logo_mcr.webp` tras verificar fidelidad. Negro y amarillo como firma visual; superficies neutras para trabajo intensivo. Glassmorphism ahumado con moderación. No usar verde petróleo anterior.

## Experiencias

- Empleado: jornada y acción principal visibles al entrar; agenda, solicitudes, saldo y avisos en segundo nivel.
- Jefatura: pendientes que realmente puede decidir, equipo autorizado, agenda e incidencias.
- Dirección: lectura agregada y detalles autorizados; no inventar permisos.
- ADMIN/HR/SUPER_ADMIN: diagnóstico, gestión y configuración conforme a capacidades del servidor.

## Principios operativos

Cada vista responde qué ocurre, qué importa y qué hacer después. Indicadores enlazan a detalles reales. Una acción primaria por contexto. Preservar filtros, foco y posición al volver. Mostrar resultado verificado, no éxito decorativo. No bloquear toda la pantalla durante una mutación localizada.

## Plan obligatorio

1. Inventariar rutas, estados y pruebas; levantar baseline visual/performance.
2. Tokens y primitivas; comprobar contraste y temas.
3. Shell responsivo, login y dashboard; preservar rutas y permisos.
4. Asistencia móvil, incidencias y motivos; verificar idempotencia.
5. Calendario y turnos; después expedientes, solicitudes y aprobaciones.
6. Configuración, auditoría, avisos y pulido final.
7. Ejecutar gates por fase; cambios pequeños y reversibles, sin migraciones no autorizadas.

## Alcance

Obligatorio: rediseño de las rutas existentes. Propuestas sujetas a validación: búsqueda global de entidades, duplicación/operaciones masivas, reportes nuevos, exportación, PWA, biometría, offline, soporte y expediente documental. No instalar paquetes ni crear API sin justificar y obtener autorización conforme a políticas del repositorio. La navegación por comandos locales de rutas autorizadas sí puede construirse sin API nueva.

Consulta los documentos 01–14 para los contratos visuales y aceptación. Al finalizar cada fase entrega archivos modificados, pruebas ejecutadas, evidencia visual, mediciones, riesgos y funcionalidades pendientes. No declares listo lo que no probaste.
