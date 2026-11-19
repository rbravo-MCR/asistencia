# Comparación de rendimiento y evidencia visual

Build de producción servido localmente con gzip y API/PostgreSQL reales en `_test`. Chromium 158.0.8127.18. Mismo recolector/protocolo que la entrega anterior: tres cargas frías por ruta/perfil, contextos nuevos, caché desactivada. Desktop 1440×900; restringido 390×900, CPU ×4, latencia 150 ms, descarga 200000 B/s y subida 93750 B/s. Tres corridas adicionales con fuentes bloqueadas. CLS cubre la ventana de carga hasta 500 ms después de red/fuentes, no toda una sesión.

[Datos brutos](evidence/browser-baseline.json), [recolector](evidence/capture-production.mjs.txt), [salida](evidence/capture.txt). Los datos son fixtures ficticios de la base de prueba. No se capturan cuentas de desarrollo empresariales.

## Carga frente a la entrega de tokens

LCP en segundos, CLS sin unidad; cada fila conserva mediana y peor de las tres corridas.

| Perfil / ruta                     | LCP anterior mediana | LCP actual mediana / peor | CLS anterior mediana | CLS actual mediana / peor |
| --------------------------------- | -------------------: | ------------------------: | -------------------: | ------------------------: |
| desktop `/ingresar`               |                0.184 |             0.212 / 0.304 |                0.016 |             0.016 / 0.016 |
| desktop `/`                       |                0.496 |             0.568 / 0.576 |                0.147 |             0.039 / 0.039 |
| desktop `/asistencia`             |                0.252 |             0.316 / 0.320 |                0.064 |             0.106 / 0.112 |
| constrained `/ingresar`           |                2.504 |             2.600 / 2.620 |                0.036 |             0.036 / 0.036 |
| constrained `/`                   |                2.740 |             3.028 / 3.052 |                0.124 |             0.044 / 0.044 |
| constrained `/asistencia`         |                2.660 |             2.912 / 2.968 |                0.167 |             0.258 / 0.258 |
| desktop-font-fallback `/ingresar` |                0.208 |             0.204 / 0.208 |                0.016 |             0.016 / 0.016 |

JS inicial completo: **265.61 KiB gzip**, frente a 249.44 KiB en la entrega de tokens (+6.48 %) y 278.39 KiB en la referencia original (-4.59 %). Incluye bootstrap local. CSS: 8.59 KiB gzip. [Desglose](evidence/bundle.json). El shell con paneles e iconos añade coste; no se presenta como una reducción frente a la etapa de tokens ni se instalan paquetes nuevos.

La comparación es laboratorio local con tres muestras, sin significancia estadística ni percentil 75 de campo. Permanecen abiertos los presupuestos globales LCP ≤2.5 s, CLS ≤0.1 y JS preliminar ≤200 KiB cuando los datos los exceden. No se afirma INP, Lighthouse, Safari, lector de pantalla o GPS físico certificados. La aceptación integral de rendimiento del producto requiere las fases siguientes; no se ocultan costes tras la mejora visual.

El dashboard restringido pasa de 2.740 a 3.028 s de LCP y asistencia de 2.660 a 2.912 s; son costes de esta entrega que requieren seguimiento. El CLS del dashboard mejora, pero asistencia restringida pasa de 0.167 a 0.258. El encabezado compacto no resuelve por sí solo los desplazamientos del contenido. Estos resultados mantienen abierta la aceptación integral de rendimiento; no se sustituyen por una impresión visual favorable.

## Composición y responsive

En los ocho recorridos de producción de Usuarios, el encabezado mide 72 px y no hay overflow horizontal global. La referencia anterior de shell administrativo medía 217 px a 1440: 145 px menos. Sidebar desktop de 256 px, colapsado 80 px; móvil/tablet con drawer. El directorio usa el ancho del área de trabajo y el formulario deja de ocupar una segunda columna permanente. No se mide tiempo de tarea humano con capturas.

Los E2E verifican 320/360/390/768/1024/1280/1440, ambos temas, foco inicial, ciclo de Tab, Escape y retorno al disparador, incluida la apertura desde Más. Las pruebas reales de formulario incluyen conflicto por correo duplicado sin perder texto, alta/edición persistida, filtros de estado/rol, recovery ocultable, Atrás y recarga cancelados, y foco a búsqueda si la fila deja de coincidir.

Revisadas visualmente capturas representativas desktop claro/oscuro, móvil y paneles. Los correos largos se envuelven; los roles conservan texto, y las cuentas protegidas no ofrecen controles no autorizados. Las capturas full-page móviles incluyen la barra fija en la posición del viewport inicial; el contenido se desplaza y conserva espacio inferior.

| Producción: Usuarios | Claro                                      | Oscuro                                    |
| -------------------- | ------------------------------------------ | ----------------------------------------- |
| 320 px               | [PNG](screenshots/light-320-usuarios.png)  | [PNG](screenshots/dark-320-usuarios.png)  |
| 390 px               | [PNG](screenshots/light-390-usuarios.png)  | [PNG](screenshots/dark-390-usuarios.png)  |
| 768 px               | [PNG](screenshots/light-768-usuarios.png)  | [PNG](screenshots/dark-768-usuarios.png)  |
| 1440 px              | [PNG](screenshots/light-1440-usuarios.png) | [PNG](screenshots/dark-1440-usuarios.png) |

| Interacción       | Claro                                                       | Oscuro                                                     |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Usuarios 320 px   | [PNG](screenshots/interactions/users-light-320.png)         | [PNG](screenshots/interactions/users-dark-320.png)         |
| Usuarios 360 px   | [PNG](screenshots/interactions/users-light-360.png)         | [PNG](screenshots/interactions/users-dark-360.png)         |
| Usuarios 390 px   | [PNG](screenshots/interactions/users-light-390.png)         | [PNG](screenshots/interactions/users-dark-390.png)         |
| Usuarios 768 px   | [PNG](screenshots/interactions/users-light-768.png)         | [PNG](screenshots/interactions/users-dark-768.png)         |
| Usuarios 1024 px  | [PNG](screenshots/interactions/users-light-1024.png)        | [PNG](screenshots/interactions/users-dark-1024.png)        |
| Usuarios 1280 px  | [PNG](screenshots/interactions/users-light-1280.png)        | [PNG](screenshots/interactions/users-dark-1280.png)        |
| Usuarios 1440 px  | [PNG](screenshots/interactions/users-light-1440.png)        | [PNG](screenshots/interactions/users-dark-1440.png)        |
| Editor desktop    | [PNG](screenshots/interactions/editor-light-desktop.png)    | [PNG](screenshots/interactions/editor-dark-desktop.png)    |
| Editor móvil      | [PNG](screenshots/interactions/editor-light-mobile.png)     | [PNG](screenshots/interactions/editor-dark-mobile.png)     |
| Sidebar colapsado | [PNG](screenshots/interactions/sidebar-collapsed-light.png) | [PNG](screenshots/interactions/sidebar-collapsed-dark.png) |
| Menú móvil        | [PNG](screenshots/interactions/sidebar-mobile-light.png)    | [PNG](screenshots/interactions/sidebar-mobile-dark.png)    |

Antes: [desktop](screenshots/before-desktop.png), [móvil](screenshots/before-mobile.png). [Acceso público con sesión aún pendiente](screenshots/login-session-loading.png).
