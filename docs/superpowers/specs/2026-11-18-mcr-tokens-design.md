# Identidad y tokens MCR — punto 3

Autorización: el usuario pidió «dale al punto 3» tras aprobar la lista y cerrar contraste/inventario. Se ejecuta el alcance ya descrito en guías 01–02, sin otra ronda de aprobación.

Se amplía `styles.css`/Tailwind 4 con los siete colores MCR, tokens semánticos de superficies/texto/acciones/enlaces/estado/foco, espacios 4–48, radios y movimiento. Tema claro/oscuro/sistema, inicializado por script local clásico en head antes del primer pintado; solo persiste `mcr-theme`, sin datos privados. El mismo controlador atiende selector, cambios del sistema y otras pestañas. React presenta un select nativo accesible, sin cliente/estado servidor adicional.

Enfoques considerados: cambiar solo paleta dejaría enlaces amarillos ilegibles y superficies blancas en oscuro; duplicar CSS por pantalla crearía sistemas paralelos. Se elige extender tokens existentes y sustituir usos incompatibles por semántica, conservando estructura y comportamiento. No rediseñar shell, CRUD o flujos de negocio (puntos 4–11).

Logo: la variante WebP actual es un escudo con mapa y no coincide con el PNG original de texto México Car Rental. Se usará el PNG original, sin modificar sus píxeles ni proporciones; object-fit recorta solo márgenes vacíos y fondo negro conserva letras blancas. Google Sans verificada en repositorio oficial google/fonts bajo OFL 1.1; WOFF2 variable latin/latin-ext normal e itálica del servicio oficial, alojadas localmente con licencia y procedencia/hash. Sin dependencias de fuente en red al usar la app.

Amarillo/negro para acción y selección; enlaces azules accesibles en claro y azul claro en oscuro; rojo de texto separado del fondo destructivo con texto blanco. Estados semánticos conservan mensajes e iconos existentes. Anillos y límites funcionales ≥3:1, texto normal ≥4.5:1. Reduced motion y forced colors conservan funciones.

Aceptación: selector/persistencia/seguimiento sistema/almacenamiento denegado/cambio entre pestañas, tema antes del render, fuentes locales cargadas y fallo de fuente recuperable, contraste medido en navegador, capturas login/dashboard/asistencia/calendario en dos temas. Pruebas existentes y PostgreSQL/E2E completos; medición comparativa de build. Formato del paquete original se normaliza sin cambiar contenido para recuperar gate global, conservando snapshot de fase anterior.

Sin commits/worktree: HEAD inexistente y árbol completo sin seguimiento, confirmado al inicio; se trabaja en sitio con snapshot/hashes previos para no crear un commit que mezcle todo. Sin backend, contratos, migraciones, .env, reglas laborales, datos empresariales o paquetes nuevos. Las brechas generales de layout/rendimiento del baseline se conservan como pendientes de fases posteriores, salvo regresiones introducidas por tokens/fuente.

Ajuste de rendimiento autorizado por el alcance: peso variable 400–700 y tamaño óptico 17 fijo en los WOFF2 oficiales para reducir peso, conservando familia y cobertura latin/latin-ext. No se recorta por textos o datos de la aplicación. Se difiere el código de rutas operativas con la API instalada de TanStack Router, conservando guards y rutas.
