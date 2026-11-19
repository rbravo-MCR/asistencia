# Departamentos — referencia visual y funcional MCR

El usuario detiene la expansión del rediseño y limita la siguiente entrega a Departamentos. No trasladar el diseño a otros módulos hasta su revisión de capturas. Se conserva el trabajo existente; no se revierte ni modifica negocio.

Composición propuesta: página de ancho del workspace, encabezado editorial compacto Google Sans con una acción amarilla, sección Directorio con búsqueda y cantidad real filtrada, tabla de filas espaciadas con iconografía y divisores sutiles. Sin tarjetas exteriores, estadísticas, estados o campos nuevos. Nombre y fecha existentes conservados, con fecha debajo del nombre en móvil. Un botón de puntos por fila abre menú accesible Editar/Eliminar.

Alta y edición en SidePanel existente: foco inicial en nombre, Tab atrapado, Escape/cancelación con decisión si dirty, Atrás/recarga protegidos, errores conservados, CSRF y esquema existentes, sin reintento automático de writes, pending evita doble envío. Éxito confirmado cierra drawer y deja aviso persistente ocultable; filtros permanecen. Si la fila desaparece al guardar bajo filtro, foco vuelve a búsqueda. Eliminar usa AlertDialog con cancelación, confirmación explícita, bloqueo por referencias y errores persistentes. No se elimina optimistamente.

Glass selectivo: header existente y menú/confirmación flotantes con fallback opaco, contraste independiente y reducción de efectos. Formulario y tabla sólidos conforme guía 04. Scrollbar del sidebar discreto, con ancho/contraste funcional y soporte Firefox/Chromium; nunca ocultar el scroll.

Mantener GET/POST/PUT/DELETE, permisos manageOrganization y restricciones del servidor, normalización NFC/trim, 1–100 puntos Unicode, unicidad y bloqueo por referencias. Sin API, paquetes, saldos, datos operativos o métricas inventadas.

Aceptación: captura previa; interacción real y PostgreSQL aislado; claro/oscuro en 320–1440 px, drawer y menú con teclado/foco, estados loading/empty/error, duplicado y persistencia, fuente real y contraste. Capturas Playwright guardadas para revisión del usuario. Ningún otro módulo se rediseña en esta entrega.
