# Diseño responsivo y experiencia móvil

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Layouts

320 px como mínimo de reflow accesible; diseño de referencia 360/390, tablet 768/1024, desktop 1280/1440. Sidebar completa desde 1280, colapsable en desktop; drawer en tamaños intermedios y navegación inferior móvil para funciones principales. Breakpoints son propuestas, ajustar según contenido, no agente de usuario. Mantener una sola aplicación y router.

## Comportamiento

- `min-width: 0` en flex/grid; evitar overflow global. Dashboard 1→2→4 columnas según espacio real.
- Header compacto; búsqueda en diálogo móvil; filtros en sheet accesible con estado aplicado.
- Tablas densas: priorizar columnas o vista tarjetas con datos esenciales y acceso a detalle; scroll horizontal local cuando tabla bidimensional lo requiera. No ocultar campos críticos sin alternativa.
- Calendario: agenda móvil como alternativa al mes; edición por formulario en vez de exigir gesto de arrastre.
- Formularios de una columna en móvil; diálogos largos con scroll y footer que no tape foco.
- Acciones táctiles preferidas 44–48 px; espacio suficiente. Safe areas con `env(safe-area-inset-bottom)` y padding de contenido para barras fijas.
- Usar `100dvh` con fallback cuando aplique; revisar teclado virtual, landscape y zoom. No bloquear zoom.

## Jornada

Acción principal accesible sin scroll innecesario; horario, modalidad y estado de marcaje visibles. Mostrar errores de GPS únicamente cuando corresponda. Sin permiso de ubicación, explicar recuperación sin fingir marcaje. No solicitar ubicación en home office.

## Alcance

No PWA, service worker, offline ni biometría en esta fase; son etapas posteriores de proyecto. No almacenar datos privados para fingir operación sin red.

## Matriz de revisión

320/360/390/768/1024/1280/1440; claro/oscuro; teclado virtual; zoom 200% y reflow a 320 CSS px; Chromium y prueba manual Safari/Firefox cuando disponibles. Verificar que foco y botones no queden bajo header/bottom nav. Incluir teléfono real para GPS; permisos emulados no certifican precisión física.
