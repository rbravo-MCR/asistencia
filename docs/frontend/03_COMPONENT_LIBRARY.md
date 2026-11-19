# Biblioteca de componentes y patrones

**MCR · Sistema de asistencia | Directrices de implementación | 18-11-2026**

## Base existente

Reutilizar `components/ui/{button,input,label,badge,card,table}.tsx`, Radix y utilidades existentes. Extender variantes con CVA y utilidades Tailwind. No crear otra copia de Button ni instalar una segunda biblioteca.

| Componente propuesto        | Contrato de UX                                             |
| --------------------------- | ---------------------------------------------------------- |
| AppShell / Sidebar / Header | Rutas tipadas, permisos vigentes, estado activo, colapso   |
| PageHeader                  | Título, descripción opcional, acción principal             |
| StatusBadge                 | Estado explícito, icono opcional, variante semántica       |
| DataTable                   | Encabezados accesibles, vacíos/error, navegación y filtros |
| FilterBar                   | Filtros activos, limpiar, rango real validado              |
| FormField                   | Label, descripción, error ligado por ID                    |
| Dialog / Sheet              | Foco atrapado, Escape, regreso al disparador               |
| ConfirmAction               | Efecto, entidad, motivo si contrato lo exige               |
| AsyncState                  | loading/error/empty/forbidden con reintento apropiado      |
| Toast / InlineNotice        | Feedback no duplicado; errores persistentes en contexto    |
| MetricLink                  | Valor, definición, destino real o detalle                  |
| CommandPalette              | Rutas/acciones permitidas, teclado y búsqueda              |
| AttendanceAction            | Estado desde API, pending y resultado aceptado/rechazado   |
| GlassSurface                | Variantes limitadas por documento 04                       |

## Interfaces

Primitivas reciben props visuales y accesibilidad; patrones reciben datos ya preparados. No efectuar fetch ni decidir permisos dentro de Button o Badge. Componentes de feature orquestan queries/mutations. No pasar todo el objeto sesión cuando basta un permiso. Preferir composición a flags booleanos combinatorios.

## Estados de interacción

Botones pending conservan anchura y texto comprensible; impedir doble envío sin ocultar estado. Inputs con valores controlados según patrón actual; no perder texto al fallar. Dialog de cambios sin guardar solo si realmente existen cambios. Escape no elimina información silenciosamente. Tablas no inventan paginación de servidor; usar real si endpoint la admite (auditoría). Para listado local, indicar alcance y cantidad real.

## Pruebas

Testing Library por rol/nombre accesible, no clases CSS. Pruebas de teclado, foco, error y disabled/pending. Capturas visuales de variantes claras/oscuras. No duplicar lógica de negocio en un componente genérico.
