# Rendimiento y revisión visual del punto 3

## Protocolo

Compilación de producción, Chromium 158.0.8127.18, API real y PostgreSQL aislado `_test`. Tres cargas frías por combinación: desktop 1440×900 y restringido 390×900, CPU ×4, latencia 150 ms, descarga 200000 B/s, subida 93750 B/s. Caché desactivada, fuentes locales, gzip y contexto nuevo. Mismo protocolo de la [línea base](../2026-11-18-ux-ui-baseline/03-baseline.md); se añaden tres cargas desktop con fuente bloqueada. CLS corresponde a la ventana de carga hasta 500 ms después de estabilizar red/fuentes, no a una sesión completa.

[21 mediciones brutas y 32 recorridos](evidence/browser-baseline.json), [recolector reproducible](evidence/capture-production.mjs.txt), [salida](evidence/capture.txt). Sin errores JavaScript capturados. Fixtures ficticios creados y eliminados solo en la base de prueba; [comprobación de limpieza](evidence/fixture-cleanup.json).

## Comparación de carga

LCP en segundos; CLS sin unidad. Cada fila resume tres corridas válidas, incluyendo la peor; no se descartan corridas lentas.

| Perfil / ruta                     | LCP anterior mediana | LCP final mediana / peor | CLS anterior mediana | CLS final mediana / peor |
| --------------------------------- | -------------------: | -----------------------: | -------------------: | -----------------------: |
| desktop `/ingresar`               |                0.216 |            0.184 / 0.224 |                0.000 |            0.016 / 0.016 |
| desktop `/`                       |                0.520 |            0.496 / 0.508 |                0.148 |            0.147 / 0.147 |
| desktop `/asistencia`             |                0.296 |            0.252 / 0.260 |                0.434 |            0.064 / 0.440 |
| constrained `/ingresar`           |                2.404 |            2.504 / 2.508 |                0.076 |            0.036 / 0.036 |
| constrained `/`                   |                2.788 |            2.740 / 2.776 |                0.112 |            0.124 / 0.124 |
| constrained `/asistencia`         |                2.600 |            2.660 / 2.668 |                0.965 |            0.167 / 0.167 |
| desktop-font-fallback `/ingresar` |                    — |            0.208 / 0.364 |                    — |            0.016 / 0.016 |

El JS inicial total baja de **278.39 a 249.44 KiB gzip (−10.4 %)** incluyendo el controlador de tema externo (554 B gzip). CSS pasa de 5.95 a 7.01 KiB gzip; el preload de Google Sans añade 35876 B. Los módulos operativos se cargan por ruta mediante TanStack Router existente, con estado pendiente accesible. Las 22 rutas y sus permisos permanecen. [Inventario de bundle](evidence/bundle.json).

El tema queda resuelto antes del primer pintado en las 21 mediciones, con una solicitud local de bootstrap en cada corrida. Google Sans carga en las 18 corridas normales y está ausente en las tres de fallback, que conservan lectura y operación. El controlador externo diferido funciona con CSP `script-src self`; una prueba separada retrasa su respuesta 200 ms y verifica tema antes de la entrada principal y bloqueo de un script inline ajeno. [Prueba real sobre dist](evidence/bootstrap-production-green.txt).

## Pendientes de aceptación integral

- Meta LCP ≤2.5 s: las tres medianas restringidas son 2.504, 2.740 y 2.660 s. Login sube 100 ms y asistencia 60 ms frente al baseline; dashboard mejora 48 ms. El coste de fuente/tema no se oculta tras el ahorro de JavaScript. Tres corridas no permiten afirmar significancia estadística.
- Meta CLS ≤0.1: dashboard sigue excediéndola en ambos perfiles; asistencia restringida también. Asistencia desktop mejora en mediana, pero su peor corrida es 0.440: el problema no está resuelto. Login desktop pasa de 0 a 0.016 y restringido mejora a 0.036.
- Los desplazamientos de carga y la altura del menú requieren el trabajo de shell y estados de carga de las fases siguientes. Conservar reserva de espacio y medir otra vez por pantalla; no declarar cierre global con estas cifras.
- JS sigue por encima de la referencia preliminar 200 KiB. No se han medido INP de campo, percentil 75, Lighthouse, Safari ni un móvil físico. No se inventan puntuaciones ni se equiparan long tasks con INP.

## Evidencia visual

32 capturas de producción: acceso, dashboard, asistencia y calendario; 320, 390, 768 y 1440 px; claro/oscuro. Todas cargan Google Sans y no presentan overflow horizontal global. Esto no prueba ausencia de recortes internos o cobertura responsive de las otras 18 rutas. Cuatro capturas adicionales del espécimen de desarrollo, 1280/412 px.

Revisadas visualmente las vistas representativas de dashboard oscuro desktop y asistencia clara móvil, además de las revisiones previas de header/espécimen. La identidad y legibilidad quedan aplicadas; la navegación todavía ocupa muchas filas y el dashboard conserva la composición anterior. No se presentan como rediseño premium final. Los conteos de objetivos pequeños del recolector son indicios para la fase de componentes, no una auditoría automática WCAG completa.

| Pantalla / ancho  | Claro                                        | Oscuro                                      |
| ----------------- | -------------------------------------------- | ------------------------------------------- |
| ingresar / 320    | [PNG](screenshots/light-320-ingresar.png)    | [PNG](screenshots/dark-320-ingresar.png)    |
| ingresar / 390    | [PNG](screenshots/light-390-ingresar.png)    | [PNG](screenshots/dark-390-ingresar.png)    |
| ingresar / 768    | [PNG](screenshots/light-768-ingresar.png)    | [PNG](screenshots/dark-768-ingresar.png)    |
| ingresar / 1440   | [PNG](screenshots/light-1440-ingresar.png)   | [PNG](screenshots/dark-1440-ingresar.png)   |
| dashboard / 320   | [PNG](screenshots/light-320-dashboard.png)   | [PNG](screenshots/dark-320-dashboard.png)   |
| dashboard / 390   | [PNG](screenshots/light-390-dashboard.png)   | [PNG](screenshots/dark-390-dashboard.png)   |
| dashboard / 768   | [PNG](screenshots/light-768-dashboard.png)   | [PNG](screenshots/dark-768-dashboard.png)   |
| dashboard / 1440  | [PNG](screenshots/light-1440-dashboard.png)  | [PNG](screenshots/dark-1440-dashboard.png)  |
| asistencia / 320  | [PNG](screenshots/light-320-asistencia.png)  | [PNG](screenshots/dark-320-asistencia.png)  |
| asistencia / 390  | [PNG](screenshots/light-390-asistencia.png)  | [PNG](screenshots/dark-390-asistencia.png)  |
| asistencia / 768  | [PNG](screenshots/light-768-asistencia.png)  | [PNG](screenshots/dark-768-asistencia.png)  |
| asistencia / 1440 | [PNG](screenshots/light-1440-asistencia.png) | [PNG](screenshots/dark-1440-asistencia.png) |
| calendario / 320  | [PNG](screenshots/light-320-calendario.png)  | [PNG](screenshots/dark-320-calendario.png)  |
| calendario / 390  | [PNG](screenshots/light-390-calendario.png)  | [PNG](screenshots/dark-390-calendario.png)  |
| calendario / 768  | [PNG](screenshots/light-768-calendario.png)  | [PNG](screenshots/dark-768-calendario.png)  |
| calendario / 1440 | [PNG](screenshots/light-1440-calendario.png) | [PNG](screenshots/dark-1440-calendario.png) |
| Espécimen / 1280  | [PNG](screenshots/specimen-1280-light.png)   | [PNG](screenshots/specimen-1280-dark.png)   |
| Espécimen / 412   | [PNG](screenshots/specimen-412-light.png)    | [PNG](screenshots/specimen-412-dark.png)    |
