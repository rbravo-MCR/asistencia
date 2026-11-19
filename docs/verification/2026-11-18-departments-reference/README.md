# Departamentos — referencia MCR para revisión

18-11-2026. Alcance autorizado: Departamentos y refinamiento solicitado del scrollbar del sidebar/superficies flotantes. **La expansión a otros módulos permanece detenida hasta la revisión visual del usuario.** [Spec](../../superpowers/specs/2026-11-18-departments-reference.md) · [Plan](../../superpowers/plans/2026-11-18-departments-reference.md).

## Cambios y aceptación

| Criterio solicitado              | Implementación y comprobación                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin formulario permanente        | Solo botón Nuevo departamento en la vista; campo ausente hasta abrir drawer.                                                                                   |
| Alta/edición en drawer accesible | SidePanel existente, foco inicial, Tab contenido, Escape, retorno al origen o búsqueda, dirty/back/recarga y pending protegidos.                               |
| Acciones contextuales            | Un trigger de puntos por fila; menú Radix por teclado. Eliminar conserva confirmación explícita, cancelación y bloqueo por referencias.                        |
| Ancho y jerarquía                | Workspace hasta 1600 px, Google Sans, título 28/32, directorio sin tarjetas exteriores, filas espaciadas, iconos y separadores sutiles.                        |
| Búsqueda                         | Filtrado local por nombre del GET autorizado; conserva texto/contexto y tiene vacío específico. Sin API o paginación ficticia.                                 |
| Hover/focus/loading/empty/error  | Estados y reintento verificables; capturas en ambos temas, siete anchos y lectura sin permisos.                                                                |
| Black & Gold y glass selectivo   | Siete tokens oficiales conservados; header existente, menú/confirmación/aviso flotantes con fallback opaco y reducción de efectos. Tabla y formulario sólidos. |
| Scrollbar                        | Clase scoped, ancho fino, thumb visible, contraste funcional y fallback de colores forzados.                                                                   |
| Funcionalidad y permisos         | API/esquema intactos: NFC/trim, Unicode 1–100, unicidad, CSRF, GET/POST/PUT/DELETE y referencias. Sin retry automático de writes o eliminación optimista.      |

## Evidencia real

- [pnpm check](evidence/check.txt): lint, arquitectura, formato, tipos, **189 pruebas unitarias/UI** y build aprobados.
- [PostgreSQL](evidence/integration.txt): **175 pruebas** aprobadas en base aislada.
- [Playwright completo](evidence/e2e.txt): **74 pruebas** aprobadas, escritorio/móvil. Total de suite final **438**; repeticiones parciales no se suman.
- [Revisión y correcciones](evidence/review.md), [conservación de fuentes](evidence/source-preservation.json), [capturas y mediciones](PERFORMANCE.md).
- 44 capturas finales de interacción/estados, 8 de producción y 2 previas; 6 mediciones iniciales y 6 finales sobre producción. No son datos empresariales de demostración ni puntuaciones inventadas.

Las pruebas conservan validación en blanco/duplicado, error de red sin retry ni pérdida de texto, pending sin doble envío, normalización y CSRF. El recorrido E2E verifica CRUD con API y PostgreSQL reales, recarga/persistencia, PUT lento protegido y borrado con GET lento/foco estable. Las pruebas de lectura niegan POST realmente (403); las de referencias preservan el bloqueo del servidor.

No cambiaron backend, contratos, migraciones, paquetes/lockfile, .env, tipografías, otras pantallas o reglas de negocio. Los datos QA se crean y eliminan únicamente en `_test`. El código sigue el árbol existente sin crear un commit inicial de trabajo ajeno.

## Revisión visual pendiente

Ver [claro](screenshots/final/departments-light-1440.png), [oscuro](screenshots/final/departments-dark-1440.png), [drawer](screenshots/final/drawer-dark-desktop.png) y [móvil](screenshots/final/departments-light-390.png), o abrir http://127.0.0.1:5173/departamentos con la cuenta de revisión existente.

Esta pantalla queda como propuesta de referencia para tu revisión; no se replica en otros módulos en esta entrega. Los presupuestos globales de carga se mantienen explícitos en PERFORMANCE.md. No se afirma accesibilidad certificada, rendimiento de campo, GPS físico o producción lista por estas verificaciones locales.

Actualización visual posterior: [iconos refinados y capturas vigentes](../2026-11-18-departments-icons/README.md). Se conserva esta evidencia anterior para comparación.
