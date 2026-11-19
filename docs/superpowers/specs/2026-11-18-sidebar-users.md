# Sidebar MCR y directorio de usuarios

Petición autorizada: sustituir menú superior por sidebar ordenado y mejorar sustancialmente Usuarios. Se ejecuta el alcance concreto de componentes/navegación/Usuarios del plan premium existente, sin esperar otra aprobación del mismo alcance.

Sidebar negro MCR, grupos con iconos, selección amarilla, colapso desktop, desplazamiento independiente y encabezado compacto. Drawer accesible en tablet/móvil con Escape, bloqueo de fondo y restauración de foco; cuatro accesos móviles. Mantener las capacidades actuales y 22 rutas, cuenta/estado/avisos disponibles. No inferir aprobación de un rol global.

Usuarios deja de ser dos tarjetas apiladas: cabecera con acción de alta, indicadores derivados del listado real, búsqueda y filtros locales con alcance explícito, tabla desktop y filas adaptadas a móvil. Acciones con nombres accesibles por cuenta. Alta/edición en panel lateral sólido con validación actual, estado guardando, errores preservados y protección de cambios sin guardar. Recovery temporal ocultable y cuentas SUPER_ADMIN protegidas como antes. Sin simulaciones, paginación ficticia ni operaciones masivas.

Reutilizar React/TanStack/Radix/lucide y primitivas existentes; no dependencias nuevas, backend/contratos/migraciones/.env intactos. Google Sans, paleta corporativa y temas vigentes. Glass solo encabezado con fallback opaco y reducción de transparencia; tabla/formulario sólidos.

Aceptación: menú lateral real en 1280/1440; drawer usable a 320/390/768; tabla sin overflow global; filtros y edición funcionan por teclado; formularios no pierden texto ante error; cambios sin guardar requieren decisión; protecciones no retroceden. Pruebas de negocio y suites actuales con adaptación de recorridos al nuevo menú, capturas claras/oscuras y comparación de peso del build. Sin afirmar producción o accesibilidad certificada.
